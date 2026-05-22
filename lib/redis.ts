import Redis from "ioredis"; // ✅ FIX مهم

const redisUrl = process.env.REDIS_URL;

// ❌ حماية مبكرة (fail fast)
if (!redisUrl) {
  throw new Error("❌ REDIS_URL is missing in environment variables");
}

// 🔥 إنشاء Redis client
export const connection = new Redis(redisUrl, {
  //////////////////////////////////////////////////
  // ⚡ BullMQ stability
  //////////////////////////////////////////////////
  maxRetriesPerRequest: null,
  enableReadyCheck: true,

  //////////////////////////////////////////////////
  // 🔌 Connection stability
  //////////////////////////////////////////////////
  retryStrategy(times) {
    return Math.min(times * 200, 5000);
  },

  reconnectOnError(err) {
    const targetErrors = ["READONLY", "ECONNRESET", "ETIMEDOUT"];
    return targetErrors.some((e) => err.message.includes(e));
  },

  //////////////////////////////////////////////////
  // ⚡ Performance tuning
  //////////////////////////////////////////////////
  keepAlive: 30000,
  family: 4,
  lazyConnect: false,

  //////////////////////////////////////////////////
  // 🧠 Production safety
  //////////////////////////////////////////////////
  enableOfflineQueue: true,
});

//////////////////////////////////////////////////
// 📡 Logging (DEV only)
//////////////////////////////////////////////////

if (process.env.NODE_ENV !== "production") {
  connection.on("connect", () => {
    console.log("🟢 Redis connected");
  });

  connection.on("error", (err) => {
    console.error("🔴 Redis error:", err.message);
  });
}