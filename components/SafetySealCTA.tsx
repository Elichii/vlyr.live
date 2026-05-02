"use client"
import { motion } from "framer-motion"
import { BadgeCheck } from "lucide-react"

export const SafetySealCTA = () => {
  return (
    <section className="w-full py-24 px-6 lg:px-8 bg-[#0A0A0A]">
      <div className="max-w-4xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          {/* VLYR Badge */}
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-[#FFE100]/10 border border-[#FFE100]/20 mb-8">
            <BadgeCheck className="w-10 h-10 text-[#FFE100]" strokeWidth={1.5} />
          </div>

          <h2 className="text-4xl lg:text-[56px] leading-[1.1] tracking-tight text-white font-bold mb-6">
            Ready to Deploy{" "}
            <span className="text-[#FFE100]">VLYR</span>?
          </h2>
          <p className="text-lg text-[#888888] max-w-xl mx-auto mb-10">
            Join hundreds of merchants who have upgraded their physical business into a digital powerhouse. From counter to cloud in 180 seconds.
          </p>

          {/* CTA Button with pulsing glow */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="relative bg-[#FFE100] text-[#0A0A0A] rounded-full px-10 py-5 text-lg font-bold transition-all duration-200 hover:rounded-2xl"
            style={{
              boxShadow: "0 0 20px 4px rgba(255, 225, 0, 0.3), 0 0 40px 8px rgba(255, 225, 0, 0.15)",
              animation: "vlyr-glow-pulse 3s ease-in-out infinite",
            }}
          >
            Deploy VLYR to My Business
          </motion.button>

          {/* Trust signals */}
          <div className="flex items-center justify-center gap-6 mt-10">
            {["No hardware needed", "Setup in 3 minutes", "Cancel anytime"].map((text, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 + i * 0.1 }}
                className="flex items-center gap-2"
              >
                <div className="w-1 h-1 rounded-full bg-[#FFE100]" />
                <span className="text-sm text-[#666666]">{text}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
