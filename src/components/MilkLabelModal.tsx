'use client';
import html2canvas from 'html2canvas';
import { useState } from 'react';

export default function MilkLabelModal({ 
  type, 
  data, 
  onClose 
}: { 
  type: 'raw' | 'pasteurized', 
  data: any, // Can be single log object or array of processed loops
  onClose: () => void 
}) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Normalize data to always function as an array context internally
  const labelArray = Array.isArray(data) ? data : [data];
  const activeLabel = labelArray[currentIndex];

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'absolute';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = 'none';
      iframe.style.visibility = 'hidden';
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentWindow?.document;
      if (!iframeDoc) throw new Error("Sandbox failed.");

      const stickerHtml = type === 'raw' 
        ? `
          <div style="border: 3px solid #1e293b; padding: 16px; width: 400px; height: 220px; position: relative; overflow: hidden; background-color: #ffffff; color: #0f172a; font-family: Georgia, serif; box-sizing: border-box;">
            <div style="position: absolute; top:0; left:0; width:100%; height:100%; display: flex; align-items: center; justify-content: center; opacity: 0.04; font-size: 85px; font-weight: 900; font-style: italic; font-family: sans-serif;">MHMB</div>
            <div style="position: relative; z-index: 10; display: flex; flex-direction: column; justify-content: space-between; height: 100%;">
              <div style="text-align: center; border-bottom: 2px solid #1e293b; padding-bottom: 4px; margin-bottom: 4px;">
                <h1 style="font-size: 14px; font-weight: bold; margin: 0; text-transform: uppercase;">Makati Aruga Milk Hub</h1>
                <h2 style="font-size: 11px; font-weight: 600; margin: 2px 0 0 0; text-transform: uppercase;">Unpasteurized Human Breast Milk</h2>
              </div>
              <div style="font-size: 11px; line-height: 1.35;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                  <span>DTN: <span style="text-decoration: underline; font-weight: bold;">${activeLabel.mtn}</span></span>
                  <span>AOB: <span style="text-decoration: underline;">_______</span></span>
                </div>
                <div>Volume: <span style="text-decoration: underline; font-weight: bold;">${activeLabel.volume} mL</span></div>
                <div>Mode of Collection: <span style="text-decoration: underline; font-weight: bold;">FC/PU PU:L/F</span></div>
                <div style="display: flex; justify-content: space-between; margin-top: 5px;">
                  <span>DoC: <span style="text-decoration: underline;">${new Date().toLocaleDateString('en-GB')}</span></span>
                  <span>DoPU: <span style="text-decoration: underline;">_______</span></span>
                </div>
              </div>
            </div>
          </div>
        `
        : `
          <div style="border: 3px solid #1e293b; padding: 16px; width: 400px; height: 220px; position: relative; overflow: hidden; background-color: #ffffff; color: #0f172a; font-family: Georgia, serif; box-sizing: border-box;">
            <div style="position: absolute; top:0; left:0; width:100%; height:100%; display: flex; align-items: center; justify-content: center; opacity: 0.04; font-size: 85px; font-weight: 900; font-style: italic; font-family: sans-serif;">MHMB</div>
            <div style="position: relative; z-index: 10; display: flex; flex-direction: column; justify-content: space-between; height: 100%;">
              <div style="text-align: center; border-bottom: 2px solid #1e293b; padding-bottom: 4px; margin-bottom: 4px;">
                <h1 style="font-size: 14px; font-weight: bold; margin: 0; text-transform: uppercase;">Makati Aruga Milk Hub</h1>
                <h2 style="font-size: 12px; font-weight: 600; margin: 2px 0 0 0; text-transform: uppercase;">Pasteurized Human Milk</h2>
              </div>
              <div style="font-size: 13px; line-height: 1.6; display: flex; flex-direction: column; justify-content: center; flex: 1;">
                <div>Batch No: <span style="text-decoration: underline; font-weight: bold;">#${activeLabel.batchId}</span></div>
                <div>Bottle No: <span style="text-decoration: underline;">_______</span></div>
                <div>Volume: <span style="text-decoration: underline; font-weight: bold;">${activeLabel.volume} mL</span></div>
                <div>Date of Expiration: <span style="text-decoration: underline; font-weight: bold;">${activeLabel.expiryDate}</span></div>
              </div>
            </div>
          </div>
        `;

      iframeDoc.open();
      iframeDoc.write(`<!DOCTYPE html><html><body style="margin:0;padding:0;background:#fff;"><div id="sandbox-target">${stickerHtml}</div></body></html>`);
      iframeDoc.close();

      await new Promise(resolve => setTimeout(resolve, 80));
      const target = iframeDoc.getElementById('sandbox-target');
      if (target) {
        const canvas = await html2canvas(target, { scale: 4, backgroundColor: '#ffffff' });
        const dataUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `MHMB-${type.toUpperCase()}-${type === 'raw' ? activeLabel.mtn : activeLabel.batchId}.png`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      document.body.removeChild(iframe);
    } catch (err) {
      alert("Error compiling image save download.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] print:bg-transparent print:backdrop-blur-none">
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * { visibility: hidden; }
          #printable-sticker-content, #printable-sticker-content * { visibility: visible; }
          #printable-sticker-content { position: absolute; left: 0; top: 0; margin: 0; padding: 0; box-shadow: none !important; border: 3px solid #000000 !important; }
        }
      `}} />

      <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-lg w-full print:shadow-none print:p-0 print:bg-transparent">
        
        <div className="mb-4 flex justify-between items-center print:hidden">
          <div>
            <h2 className="text-lg font-black text-slate-800 font-heading">Labels Queue Deck</h2>
            <p className="text-xs text-slate-500">Reviewing file item card entry logs.</p>
          </div>
          {labelArray.length > 1 && (
            <span className="text-xs bg-slate-100 font-black px-2.5 py-1 rounded-md text-slate-600">
              {currentIndex + 1} of {labelArray.length} Cards
            </span>
          )}
        </div>

        {/* PRINTABLE PREVIEW BLOCK */}
        <div id="printable-sticker-content" className="border-[3px] border-slate-800 p-4 w-[400px] h-[220px] mx-auto relative overflow-hidden bg-white text-slate-900 font-serif shadow-sm">
          <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none select-none">
            <span className="text-9xl font-black italic tracking-tighter">MHMB</span>
          </div>

          {type === 'raw' && (
            <div className="relative z-10 flex flex-col h-full justify-between">
              <div className="text-center border-b-2 border-slate-800 pb-1 mb-1">
                <h1 className="text-sm font-bold uppercase tracking-tight">Makati Aruga Milk Hub</h1>
                <h2 className="text-xs font-semibold uppercase">Unpasteurized Human Breast Milk</h2>
              </div>
              <div className="text-[11px] leading-tight space-y-1 font-medium">
                <div className="flex justify-between">
                  <span>DTN: <span className="underline font-bold text-sm">{activeLabel.mtn}</span></span>
                  <span>AOB: <span className="underline">_______</span></span>
                </div>
                <div>Volume: <span className="underline font-bold">{activeLabel.volume} mL</span></div>
                <div>Mode of Collection: <span className="underline font-bold">FC/PU PU:L/F</span></div>
                <div className="flex justify-between pt-1">
                  <span>DoC: <span className="underline">{new Date().toLocaleDateString('en-GB')}</span></span>
                  <span>DoPU: <span className="underline">_______</span></span>
                </div>
              </div>
            </div>
          )}

          {type === 'pasteurized' && (
            <div className="relative z-10 flex flex-col h-full justify-between">
              <div className="text-center border-b-2 border-slate-800 pb-1 mb-2">
                <h1 className="text-sm font-bold uppercase tracking-tight">Makati Aruga Milk Hub</h1>
                <h2 className="text-[13px] font-semibold uppercase">Pasteurized Human Milk</h2>
              </div>
              <div className="text-[13px] leading-relaxed space-y-1 font-medium flex-1 flex flex-col justify-center">
                <div>Batch No: <span className="underline font-bold">#{activeLabel.batchId}</span></div>
                <div>Bottle No: <span className="underline">_______</span></div>
                <div>Volume: <span className="underline font-bold">{activeLabel.volume} mL</span></div>
                <div>Date of Expiration: <span className="underline font-bold">{activeLabel.expiryDate}</span></div>
              </div>
            </div>
          )}
        </div>

        {/* PAGINATION NAVIGATION FOR SELECTIONS MULTIPLES */}
        {labelArray.length > 1 && (
          <div className="flex justify-between items-center mt-4 print:hidden px-2">
            <button 
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex(p => p - 1)}
              className="text-xs font-bold text-[#E04A75] disabled:opacity-30"
            >
              ◀ Previous Card
            </button>
            <button 
              disabled={currentIndex === labelArray.length - 1}
              onClick={() => setCurrentIndex(p => p + 1)}
              className="text-xs font-bold text-[#E04A75] disabled:opacity-30"
            >
              Next Card ▶
            </button>
          </div>
        )}

        {/* CORE UTILITIES ACTIONS FOOTER */}
        <div className="mt-6 flex gap-3 print:hidden">
          <button onClick={onClose} className="flex-1 px-4 py-3 border border-slate-300 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-50">
            Close
          </button>
          <button onClick={handleDownload} disabled={isDownloading} className="flex-1 px-4 py-3 bg-slate-800 text-white font-bold text-xs rounded-xl hover:bg-slate-700 disabled:opacity-50">
            {isDownloading ? 'Saving...' : '⬇️ Download PNG'}
          </button>
          <button onClick={handlePrint} className="flex-1 px-4 py-3 bg-[#E04A75] text-white font-bold text-xs rounded-xl hover:bg-[#C93660]">
            🖨️ Print Active
          </button>
        </div>

      </div>
    </div>
  );
}