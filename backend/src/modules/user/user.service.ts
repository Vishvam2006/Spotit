import { prisma } from '../../config/prisma';

export async function getUserProfile(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      bio: true,
      profileImage: true,
      role: true,
      createdAt: true,
    },
  });
}

export async function updateUserProfile(
  userId: string,
  data: {
    fullName?: string;
    phone?: string;
    bio?: string;
    profileImage?: string;
  }
) {
  return prisma.user.update({
    where: { id: userId },
    data,
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      bio: true,
      profileImage: true,
      role: true,
      createdAt: true,
    },
  });
}
