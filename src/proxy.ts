import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * در Next 16 فایل middleware.ts منسوخ شده و به proxy.ts تغییر نام داده است.
 * (node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md)
 *
 * وظیفه: تازه‌سازی session در هر درخواست + بستن مسیرها روی کاربر ناشناس.
 * بررسی household اینجا انجام نمی‌شود — آن یک کوئری دیتابیس است و
 * در layout بخش (app) انجام می‌گیرد.
 */
const PUBLIC_PATHS = ["/login"];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  // بدون env نباید کل اپ ۵۰۰ بدهد؛ صفحه خودش خطای واضح نشان می‌دهد.
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // getUser توکن را با سرور Supabase اعتبارسنجی می‌کند — برخلاف getSession
  // که فقط کوکی را می‌خواند و قابل جعل است.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  if (!user && !isPublic) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
  }

  if (user && isPublic) {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = "/";
    return NextResponse.redirect(homeUrl);
  }

  return response;
}

export const config = {
  matcher: [
    // همه‌چیز به‌جز فایل‌های استاتیک و تصاویر
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
