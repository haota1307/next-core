"use client";

import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/providers/auth-provider";
import { Loader2 } from "lucide-react";
import Link from "next/link";

export default function Home() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <main className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </main>
    );
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen gap-8 p-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">Chào mừng đến với Next Core</h1>
        <p className="text-muted-foreground text-lg max-w-md">
          Một nền tảng web hoàn chỉnh với authentication và role-based access control
        </p>
      </div>
      
      <div className="flex gap-4 items-center">
        {isAuthenticated ? (
          <div className="text-center space-y-4">
            <p className="text-lg">
              Xin chào, <span className="font-semibold">{user?.name || user?.email}</span>!
            </p>
            <div className="flex gap-4">
              <Link href="/admin">
                <Button size="lg">Vào Dashboard</Button>
              </Link>
              <ModeToggle />
            </div>
          </div>
        ) : (
          <div className="flex gap-4 items-center">
            <Link href="/login">
              <Button size="lg">Đăng nhập</Button>
            </Link>
            <Link href="/register">
              <Button variant="outline" size="lg">Đăng ký</Button>
            </Link>
            <ModeToggle />
          </div>
        )}
      </div>
      
      <div className="text-center text-sm text-muted-foreground mt-8">
        <p>Được xây dựng với Next.js, Prisma, và Tailwind CSS</p>
      </div>
    </main>
  );
}
