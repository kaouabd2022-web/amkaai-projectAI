"use client";

import { useState, useEffect } from "react";

const PLANS = {
  pro: {
    id: "pro",
    usd: 15,
    usdt: 15,
    dzd: 4500,
    credits: 150,
    features: ["150 Credits", "HD 1080p Generation", "Fast Rendering Process"],
  },
  premium: {
    id: "premium",
    usd: 25,
    usdt: 25,
    dzd: 7500,
    credits: 500,
    features: ["500 Credits", "4K Ultra HD Generation", "Priority Queue (Instant)", "VIP Support 24/7"],
  },
};

export default function PricingPage() {
  const [selectedPlan, setSelectedPlan] = useState<"pro" | "premium" | null>(null);
  const [paymentInfo, setPaymentInfo] = useState({ rip: "", usdt: "" });
  const [loadingCheckout, setLoadingCheckout] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/payment-info")
      .then((res) => res.json())
      .then((data) => {
        setPaymentInfo({
          rip: data?.rip || "N/A",
          usdt: data?.usdt || "N/A",
        });
      })
      .catch(() => {
        setPaymentInfo({ rip: "N/A", usdt: "N/A" });
      });
  }, []);

  const goToCheckout = async (plan: "pro" | "premium") => {
    try {
      setLoadingCheckout(true);
      setError(null);

      const res = await fetch("/api/checkout", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });

      const text = await res.text();
      let data;

      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(`Invalid server response (${res.status})`);
      }

      if (!res.ok) {
        throw new Error(data?.error || `Checkout failed (${res.status})`);
      }

      if (!data?.url) {
        throw new Error("Checkout URL missing");
      }

      window.location.assign(data.url);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Checkout failed");
    } finaly {
      setLoadingCheckout(false);
    }
  };

  const plan = selectedPlan ? PLANS[selectedPlan] : null;

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-start px-6 py-16 font-sans">
      
      {/* 1. Header Section */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <h1 className="text-5xl font-extrabold mb-4 bg-gradient-to-r from-white via-gray-300 to-gray-500 bg-clip-text text-transparent">
          AI Video SaaS 🚀
        </h1>
        <p className="text-gray-400 text-lg mb-8">
          Unlock premium AI generation tools and power up your content creation.
        </p>
        <button
          onClick={() => (window.location.href = "/dashboard")}
          className="bg-white text-black px-8 py-3.5 rounded-xl font-bold shadow-lg hover:bg-gray-200 transition-all"
        >
          🎬 Try Free Dashboard
        </button>
      </div>

      {/* 2. Pricing Cards Grid */}
      <div className="grid md:grid-cols-2 gap-8 w-full max-w-4xl mb-16">
        <PlanCard
          title="Pro"
          price={`$${PLANS.pro.usd}`}
          credits={`${PLANS.pro.credits} credits`}
          features={PLANS.pro.features}
          onClick={() => setSelectedPlan("pro")}
        />
        <PlanCard
          title="Premium"
          price={`$${PLANS.premium.usd}`}
          credits={`${PLANS.premium.credits} credits`}
          features={PLANS.premium.features}
          highlight
          onClick={() => setSelectedPlan("premium")}
        />
      </div>

      {/* 3. Trust & Security Badges */}
      <div className="max-w-md mx-auto text-center border-t border-white/10 pt-8 mb-16 w-full">
        <p className="text-sm text-gray-400 mb-3">🔒 Secured and encrypted transactions</p>
        <div className="flex justify-center gap-6 text-xs text-gray-500 font-medium">
          <span>• Card Processing via Lemon Squeezy</span>
          <span>• Supports Credit Card, USDT & BaridiMob</span>
        </div>
      </div>

      {/* 4. Features Comparison Table */}
      <div className="w-full max-w-3xl mb-20 bg-white/5 border border-white/10 rounded-2xl p-6 shadow-xl">
        <h3 className="text-xl font-bold mb-6 text-center text-white">Full Feature Comparison</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-gray-400 text-sm">
                <th className="pb-3 font-medium">Feature</th>
                <th className="pb-3 font-medium">Pro</th>
                <th className="pb-3 font-medium">Premium</th>
              </tr>
            </thead>
            <tbody className="text-gray-300 divide-y divide-white/5">
              <tr>
                <td className="py-3.5 font-medium">AI Generation Credits</td>
                <td className="py-3.5">150 Credits</td>
                <td className="py-3.5 text-cyan-400 font-bold">500 Credits</td>
              </tr>
              <tr>
                <td className="py-3.5 font-medium">Maximum Video Quality</td>
                <td className="py-3.5">HD 1080p</td>
                <td className="py-3.5">4K Ultra HD</td>
              </tr>
              <tr>
                <td className="py-3.5 font-medium">Rendering Priority</td>
                <td className="py-3.5">Standard Fast</td>
                <td className="py-3.5">Instant (Priority Queue)</td>
              </tr>
              <tr>
                <td className="py-3.5 font-medium">Customer Support</td>
                <td className="py-3.5">Email Support</td>
                <td className="py-3.5">VIP Direct 24/7</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. FAQ Section */}
      <div className="w-full max-w-3xl border-t border-white/10 pt-12">
        <h3 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h3>
        <div className="space-y-4">
          {[
            { q: "Can I cancel my subscription anytime?", a: "Yes, you can easily cancel your automated card subscription from your profile dashboard at any time without extra fees." },
            { q: "How do USDT and BaridiMob options work?", a: "When you select a plan, you can copy our wallet address or RIP. After making the transfer manually, please contact support with your transaction proof to activate your credits manually." },
            { q: "Is card payment safe here?", a: "Absolutely. We route all credit card payments securely via Lemon Squeezy, ensuring total encryption and data safety." }
          ].map((item, index) => (
            <div key={index} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden transition-all">
              <button
                onClick={() => setOpenFaq(openFaq === index ? null : index)}
                className="w-full text-left p-5 font-medium text-white flex justify-between items-center hover:bg-white/10"
              >
                <span>{item.q}</span>
                <span className="text-gray-400">{openFaq === index ? "−" : "+"}</span>
              </button>
              {openFaq === index && (
                <div className="p-5 pt-0 text-gray-400 text-sm leading-relaxed border-t border-white/5 bg-white/[0.02]">
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 6. Checkout Modal Component */}
      {selectedPlan && plan && (
        <Modal>
          <h2 className="text-xl font-bold text-center mb-2">Complete Payment</h2>
          
          <p className="text-center text-gray-400 mb-6">
            {plan.usd} USD • {plan.usdt} USDT • {plan.dzd} DZD
          </p>

          {error && (
            <div className="mb-4 rounded bg-red-500/20 border border-red-500 p-3 text-red-300 text-sm">
              {error}
            </div>
          )}

          <button
            onClick={() => goToCheckout(selectedPlan)}
            disabled={loadingCheckout}
            className="w-full bg-cyan-500 text-black py-3 rounded-xl font-bold disabled:opacity-50 hover:bg-cyan-400 transition-colors"
          >
            {loadingCheckout ? "Processing..." : "💳 Pay with Card"}
          </button>

          <div className="text-center my-4 text-xs text-gray-500 font-semibold uppercase tracking-wider">
            OR USE MANUAL TRANSFER Below
          </div>

          <div className="grid grid-cols-2 gap-4">
            <PaymentBox title="USDT" value={paymentInfo.usdt} />
            <PaymentBox title="BaridiMob (RIP)" value={paymentInfo.rip} />
          </div>

          <button
            onClick={() => {
              setSelectedPlan(null);
              setError(null);
            }}
            className="mt-6 text-gray-400 hover:text-white transition-colors w-full text-center block text-sm"
          >
            Close Window
          </button>
        </Modal>
      )}

    </main>
  );
}

function PlanCard({ title, price, credits, features, highlight, onClick }: any) {
  return (
    <div
      onClick={onClick}
      className={`p-8 rounded-2xl cursor-pointer border flex flex-col justify-between transition-all duration-300 transform hover:-translate-y-1 ${
        highlight
          ? "border-cyan-500 bg-cyan-500/10 shadow-lg shadow-cyan-500/5 relative"
          : "border-white/10 bg-white/5 hover:border-white/20"
      }`}
    >
      {highlight && (
        <span className="absolute -top-3 left-6 bg-cyan-500 text-black text-xs px-3 py-0.5 rounded-full font-bold uppercase">
          Popular
        </span>
      )}
      <div>
        <h2 className="text-2xl font-bold text-white">{title}</h2>
        <p className="text-4xl font-extrabold mt-3 text-white">{price}</p>
        <p className="text-cyan-400 text-sm font-semibold mt-1">{credits}</p>
        
        <ul className="mt-6 space-y-3 border-t border-white/5 pt-5 text-sm text-gray-300">
          {features?.map((f: string, i: number) => (
            <li key={i} className="flex items-center gap-2">
              <span className="text-cyan-500">✓</span> {f}
            </li>
          ))}
        </ul>
      </div>

      <button className={`mt-8 w-full py-3 rounded-xl font-bold transition-colors ${
        highlight ? "bg-cyan-500 text-black hover:bg-cyan-400" : "bg-white text-black hover:bg-gray-200"
      }`}>
        Choose Plan
      </button>
    </div>
  );
}

function PaymentBox({ title, value }: any) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: any) => {
    e.stopPropagation();
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-4 border border-white/10 rounded-xl bg-white/[0.01] flex flex-col justify-between">
      <div>
        <p className="text-xs text-gray-400 font-medium mb-1">{title}</p>
        <p className="text-xs font-mono break-all text-white select-all">
          {value}
        </p>
      </div>
      <button
        onClick={handleCopy}
        className="mt-3 w-full bg-white/10 text-xs py-1.5 rounded hover:bg-white/20 text-white transition-colors"
      >
        {copied ? "Copied! ✓" : "Copy Info"}
      </button>
    </div>
  );
}

function Modal({ children }: any) {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-[#0f0f0f] border border-white/10 p-8 rounded-2xl w-full max-w-md shadow-2xl">
        {children}
      </div>
    </div>
  );
}