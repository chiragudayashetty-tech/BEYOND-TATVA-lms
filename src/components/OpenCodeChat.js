// "Open WhatsApp" button for login codes. On many Android phones the code arrives without a notification,
// so parents waited for a pop-up that never came and kept asking for new codes (each cancels the last).
// This opens the chat with the number that sends the codes (AiSensy), where the newest code is waiting.
import WhatsAppIcon from "@/components/WhatsAppIcon";

export const CODE_WHATSAPP = (process.env.NEXT_PUBLIC_CODE_WHATSAPP || "917337645448").replace(/\D/g, "");

export default function OpenCodeChat({ kn = false, className = "" }) {
  return (
    <div className={className}>
      <a href={`https://wa.me/${CODE_WHATSAPP}`} target="_blank" rel="noopener" className="btn-secondary min-h-12 w-full border-2 !border-[#25D366] py-3 text-base font-semibold">
        <WhatsAppIcon className="h-5 w-5" /> {kn ? "ಕೋಡ್ ನೋಡಲು WhatsApp ತೆರೆಯಿರಿ" : "Open WhatsApp to see your code"}
      </a>
      <p className="mt-1.5 text-center text-xs text-muted">
        {kn
          ? "ನೋಟಿಫಿಕೇಶನ್‌ಗೆ ಕಾಯಬೇಡಿ. Beyond Tatva ಚಾಟ್‌ನಲ್ಲಿ ಕೊನೆಯ ಕೋಡ್ ನೋಡಿ, ಇಲ್ಲಿ ಟೈಪ್ ಮಾಡಿ."
          : "Don't wait for a notification. Copy the newest code from the Beyond Tatva chat and type it here."}
      </p>
    </div>
  );
}
