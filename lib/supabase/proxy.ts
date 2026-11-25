import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          supabaseResponse = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isDashboardRoot = pathname === "/dashboard";
  const isPesertaRoute =
    pathname === "/dashboard/peserta" ||
    pathname.startsWith("/dashboard/peserta/");

  if (user && (isDashboardRoot || isPesertaRoute)) {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("role, account_status, must_change_password")
      .eq("id", user.id)
      .maybeSingle();

    if (isPesertaRoute && (error || !profile)) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    if (
      profile?.role === "PESERTA" &&
      profile.account_status === "active" &&
      profile.must_change_password &&
      pathname !== "/dashboard/peserta/password"
    ) {
      const redirectResponse = NextResponse.redirect(
        new URL("/dashboard/peserta/password", request.url)
      );

      supabaseResponse.cookies.getAll().forEach((cookie) => {
        redirectResponse.cookies.set(cookie);
      });

      return redirectResponse;
    }
  }

  return supabaseResponse;
}
