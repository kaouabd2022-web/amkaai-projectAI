"use client";

import { useState, useEffect } from "react";
import { Check, Copy } from "lucide-react"; // تأكد من تثبيت lucide-react أو استبدلها بأيقونات مخصصة

interface ManualPaymentBoxProps {
  plan: "pro" | "premium";
  userEmail: string;
}

export default function ManualPaymentBox({ plan, userEmail }: ManualPaymentBoxProps) {
  const [paymentMethod, setPaymentMethod] = useState<"baridimob" | "crypto">("baridimob");
  const [isPending, setIsPending] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5 دقائق بالثواني
  const [copied, setCopied] = useState(false);

  // 💳 البيانات الحقيقية والكاملة (مخفية في الخلفية للنسخ فقط)
  const REAL_RIP_NUMBER = "00799999000123456789"; 
  const REAL_CRYPTO_WALLET = "TY67rX93hskdjf93847hsdkfjhskiwueh3";

  // دالة ذكية لتمويه الأرقام وعرض قناع الحماية لحساب بريدي موب
  const getMaskedNumber = (num: string) => {
    if (num.length < 10) return num;
    const firstSix = num.substring(0, 6);
    const lastFour = num.substring(num.length - 4);
    return `${firstSix} •••• •••• •••• ${lastFour}`;
  };

  // دالة ذكية لتمويه محفظة الكريبتو
  const getMaskedWallet = (wallet: string) => {
    if (wallet.length < 10) return wallet;
    return `${wallet.substring(0, 6)} •••••••••••••••••••••• ${wallet.substring(wallet.length - 4)}`;
  };

  // تشغيل العداد التنازلي عند الضغط على الزر
  useEffect(() => {
    if (!isPending || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isPending, timeLeft]);

  // دالة النسخ الذكية والآمنة للحافظة
  const handleCopy = async (textToCopy: string) => {
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000); // إعادة حالة الزر بعد ثانيتين
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleSubmitRequest = async () => {
    setIsPending(true);
    setTimeLeft(300); // إعادة ضبط الـ 5 دقائق

    try {
      // تم توجيه الرابط إلى المسار النظيف لـ manual-payment المتوافق مع مشروعك الحالي
      const res = await fetch("/api/manual-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan,
          paymentMethod,
          email: userEmail,
        }),
      });

      if (!res.ok) {
        alert("حدث خطأ أثناء إرسال الطلب، يرجى المحاولة مجدداً.");
        setIsPending(false);
      }
    } catch (error) {
      console.error(error);
      setIsPending(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <div className="p-6 bg-gray-900 border border-gray-800 rounded-xl max-w-md mx-auto text-white text-right font-sans" dir="rtl">
      <h3 className="text-xl font-bold mb-4 text-center">الدفع المحلي عبر بريدي موب / Crypto</h3>
      
      {/* اختيار طريقة الدفع */}
      <div className="flex gap-4 mb-6">
        <button 
          type="button"
          onClick={() => setPaymentMethod("baridimob")}
          className={`flex-1 py-2 rounded-lg text-center font-medium transition ${paymentMethod === "baridimob" ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400"}`}
        >
          بريدي موب (Baridimob)
        </button>
        <button 
          type="button"
          onClick={() => setPaymentMethod("crypto")}
          className={`flex-1 py-2 rounded-lg text-center font-medium transition ${paymentMethod === "crypto" ? "bg-yellow-600 text-white" : "bg-gray-800 text-gray-400"}`}
        >
          Crypto (USDT TRC20)
        </button>
      </div>

      {/* تفاصيل الدفع بناءً على الاختيار مع ميزة الإخفاء والنسخ */}
      <div className="bg-gray-800 p-4 rounded-lg mb-6 text-right text-sm">
        {paymentMethod === "baridimob" ? (
          <div>
            <p className="font-semibold text-yellow-400 mb-3 text-center">يرجى إرسال مبلغ الباقة إلى الحساب التالي:</p>
            
            <div className="flex items-center justify-between bg-gray-900 border border-white/5 p-3 rounded-xl my-2">
              <div className="flex flex-col text-right">
                <span className="text-[10px] text-gray-500 font-semibold">رقم الحساب (RIP)</span>
                <span className="text-base font-mono font-medium text-gray-300 tracking-wider select-none mt-0.5">
                  {getMaskedNumber(REAL_RIP_NUMBER)}
                </span>
              </div>
              
              <button
                type="button"
                onClick={() => handleCopy(REAL_RIP_NUMBER)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition duration-200 active:scale-95 ${
                  copied ? "bg-green-500/20 text-green-400 border border-green-500/30" : "bg-blue-600 text-white hover:bg-blue-500"
                }`}
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "تم النسخ!" : "نسخ"}</span>
              </button>
            </div>

            <p className="text-gray-400 text-center text-xs mt-2">الاسم: بن جامع محمد</p>
          </div>
        ) : (
          <div>
            <p className="font-semibold text-yellow-400 mb-3 text-center">يرجى إرسال مبلغ الباقة إلى المحفظة التالية:</p>
            
            <div className="flex items-center justify-between bg-gray-900 border border-white/5 p-3 rounded-xl my-2">
              <div className="flex flex-col text-right w-[70%]">
                <span className="text-[10px] text-gray-500 font-semibold">عنوان المحفظة (USDT)</span>
                <span className="text-xs font-mono text-gray-300 select-none truncate mt-0.5">
                  {getMaskedWallet(REAL_CRYPTO_WALLET)}
                </span>
              </div>
              
              <button
                type="button"
                onClick={() => handleCopy(REAL_CRYPTO_WALLET)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition duration-200 active:scale-95 ${
                  copied ? "bg-green-500/20 text-green-400 border border-green-500/30" : "bg-yellow-600 text-black hover:bg-yellow-500"
                }`}
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "تم النسخ!" : "نسخ"}</span>
              </button>
            </div>

            <p className="text-gray-400 text-center text-xs mt-2">الشبكة: Tron (TRC-20)</p>
          </div>
        )}
      </div>

      {/* الزر والـ Timer */}
      {!isPending ? (
        <button
          type="button"
          onClick={handleSubmitRequest}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition duration-200"
        >
          لقد قمت بالدفع، فعّل اشتراكي الآن 🚀
        </button>
      ) : (
        <div className="text-center bg-gray-800 p-4 rounded-lg border border-yellow-600/30">
          <p className="text-yellow-400 font-semibold mb-2">جاري التحقق يدويًا من وصول أموالك...</p>
          <div className="text-3xl font-mono font-bold text-white tracking-widest my-2">
            {timeLeft > 0 ? formatTime(timeLeft) : "لحظات إضافية..."}
          </div>
          <p className="text-xs text-gray-400 leading-relaxed">
            {timeLeft > 0 
              ? "يتم الآن مطابقة المعاملة على حسابنا. يمكنك الانتظار أو تصفح الموقع، سيتم تفعيل حسابك تلقائياً بمجرد تأكيد الإيداع."
              : "العملية تستغرق وقتاً أطول بقليل، نحن نراجع حسابنا الآن، سيتم تفعيل باقتك خلال دقيقة!"}
          </p>
        </div>
      )}
    </div>
  );
}