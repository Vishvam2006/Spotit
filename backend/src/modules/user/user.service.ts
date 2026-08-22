import { prisma } from '../../config/prisma';

export async function getUserProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });
  if (!user) return null;
  
  const { passwordHash, ...safeUser } = user;
  return safeUser;
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
  const user = await prisma.user.update({
    where: { id: userId },
    data,
  });
  
  const { passwordHash, ...safeUser } = user;
  return safeUser;
}
