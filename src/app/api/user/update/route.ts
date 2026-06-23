import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!session || !session.user?.name) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { newUsername, currentPassword, newPassword } = await req.json();

    const currentUser = await prisma.user.findUnique({
      where: { username: session.user.name },
    });

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify current password if changing password
    if (newPassword && currentPassword) {
      const isPasswordValid = await bcrypt.compare(currentPassword, currentUser.password);
      if (!isPasswordValid) {
        return NextResponse.json({ error: "Password saat ini salah." }, { status: 400 });
      }
    } else if (newPassword && !currentPassword) {
      return NextResponse.json({ error: "Password saat ini harus diisi." }, { status: 400 });
    }

    const updates: any = {};
    if (newUsername && newUsername !== currentUser.username) {
      // Check if new username is already taken
      const existingUser = await prisma.user.findUnique({ where: { username: newUsername } });
      if (existingUser) {
        return NextResponse.json({ error: "Username sudah dipakai orang lain." }, { status: 400 });
      }
      updates.username = newUsername;
    }

    if (newPassword) {
      updates.password = await bcrypt.hash(newPassword, 10);
    }

    if (Object.keys(updates).length > 0) {
      await prisma.user.update({
        where: { id: currentUser.id },
        data: updates,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Update User Error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
