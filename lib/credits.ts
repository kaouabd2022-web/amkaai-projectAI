import { db } from "@/lib/db";
import { AI_COSTS, AIType } from "@/lib/config";
import { UsageStatus } from "@prisma/client";

//////////////////////////////////////////////////
// 🧠 TYPES
//////////////////////////////////////////////////

type UseCreditsOptions = {
  reference?: string;
};

//////////////////////////////////////////////////
// 🚀 USE CREDITS (SAFE + ATOMIC)
//////////////////////////////////////////////////

export async function useCredits(
  userId: string,
  type: AIType,
  options?: UseCreditsOptions
) {
  const cost = AI_COSTS[type];

  if (!cost) {
    throw new Error("Invalid AI type");
  }

  const reference = options?.reference ?? null;

  const result = await db.$transaction(async (tx) => {
    //////////////////////////////////////////////////
    // 💸 DEDUCT CREDITS SAFELY
    //////////////////////////////////////////////////
    const update = await tx.user.updateMany({
      where: {
        id: userId,
        credits: {
          gte: cost,
        },
      },
      data: {
        credits: {
          decrement: cost,
        },
      },
    });

    if (update.count === 0) {
      throw new Error("Not enough credits");
    }

    //////////////////////////////////////////////////
    // 📊 USAGE LOG (TYPE SAFE)
    //////////////////////////////////////////////////
    const usage = await tx.usage.create({
      data: {
        userId,
        type,
        cost,
        status: UsageStatus.PENDING, // 🔥 FIX IMPORTANT
        refunded: false,
        referenceId: reference, // ⚠️ corrected field name
      },
    });

    //////////////////////////////////////////////////
    // 🔎 GET BALANCE
    //////////////////////////////////////////////////
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { credits: true },
    });

    return {
      usage,
      credits: user?.credits ?? 0,
    };
  });

  return {
    success: true,
    cost,
    usageId: result.usage.id,
    reference,
    remainingCredits: result.credits,
  };
}

//////////////////////////////////////////////////
// ✅ MARK SUCCESS
//////////////////////////////////////////////////

export async function markUsageSuccess(reference: string) {
  if (!reference) return;

  await db.usage.updateMany({
    where: {
      referenceId: reference,
      status: UsageStatus.PENDING,
    },
    data: {
      status: UsageStatus.COMPLETED,
    },
  });
}

//////////////////////////////////////////////////
// 💸 REFUND SYSTEM
//////////////////////////////////////////////////

export async function refundCredits(reference: string) {
  if (!reference) {
    throw new Error("Missing reference for refund");
  }

  return await db.$transaction(async (tx) => {
    const usage = await tx.usage.findFirst({
      where: { referenceId: reference },
    });

    if (!usage) {
      throw new Error("Usage not found");
    }

    if (usage.refunded) {
      return { skipped: true };
    }

    //////////////////////////////////////////////////
    // 💸 REFUND
    //////////////////////////////////////////////////
    await tx.user.update({
      where: { id: usage.userId },
      data: {
        credits: {
          increment: usage.cost,
        },
      },
    });

    await tx.usage.update({
      where: { id: usage.id },
      data: {
        refunded: true,
        status: UsageStatus.FAILED, // 🔥 FIX
      },
    });

    return {
      success: true,
      refundedCredits: usage.cost,
    };
  });
}

//////////////////////////////////////////////////
// 🔍 HELPERS
//////////////////////////////////////////////////

export async function getUserCredits(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { credits: true },
  });

  if (!user) throw new Error("User not found");

  return user.credits;
}

export async function addCredits(userId: string, amount: number) {
  return await db.user.update({
    where: { id: userId },
    data: {
      credits: {
        increment: amount,
      },
    },
  });
}