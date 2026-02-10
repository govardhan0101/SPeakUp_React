import React from 'react';
import { Phone, XCircle, MapPin } from 'lucide-react';

interface CrisisOverlayProps {
  onDismiss: () => void; // Only for demo purposes, usually strictly controlled
}

const CrisisOverlay: React.FC<CrisisOverlayProps> = ({ onDismiss }) => {
  return (
    <div className="fixed inset-0 z-50 bg-[#E6DDD0] bg-opacity-95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-[#CC5500] animate-in fade-in zoom-in duration-300">
      
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold mb-4">We are here with you.</h1>
        <p className="text-[#708090] text-lg">You don't have to carry this alone.</p>
      </div>

      <div className="w-full max-w-md space-y-4">
        <a href="tel:9152987823" className="block">
          <div className="neu-flat p-6 rounded-2xl flex items-center gap-4 active:scale-95 transition-transform border border-[#CC5500]/20">
            <div className="p-3 bg-[#CC5500] text-white rounded-full">
              <Phone size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-[#708090]">Call iCALL</h3>
              <p className="text-sm text-[#708090]/70">24/7 Professional Support</p>
            </div>
          </div>
        </a>

        <a href="tel:9820519373" className="block">
          <div className="neu-flat p-6 rounded-2xl flex items-center gap-4 active:scale-95 transition-transform border border-[#CC5500]/20">
            <div className="p-3 bg-[#8A9A5B] text-white rounded-full">
              <Phone size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-[#708090]">Call Counselor Dimple</h3>
              <p className="text-sm text-[#708090]/70">Campus Psychologist</p>
            </div>
          </div>
        </a>
        
        <div className="neu-flat p-6 rounded-2xl flex items-center gap-4 border border-[#CC5500]/20">
           <div className="p-3 bg-slate-500 text-white rounded-full">
              <MapPin size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-[#708090]">Dr. Jyoti Sangle</h3>
              <p className="text-sm text-[#708090]/70">Health Center • Block A</p>
            </div>
        </div>
      </div>

      <button 
        onClick={onDismiss}
        className="mt-12 text-[#708090] text-sm flex items-center gap-2 hover:text-[#CC5500] transition-colors"
      >
        <XCircle size={16} />
        I am safe now, return to app
      </button>
    </div>
  );
};

export default CrisisOverlay;