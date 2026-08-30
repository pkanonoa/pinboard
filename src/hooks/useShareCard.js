import { useState } from 'react';
import html2canvas from 'html2canvas';

export function useShareCard(cardRef) {
  const [isGenerating, setIsGenerating] = useState(false);

  const shareCard = async () => {
    if (!cardRef.current) return;
    setIsGenerating(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 3,           // retina quality
        useCORS: true,
        backgroundColor: null,
        logging: false
      });
      const blob = await new Promise(resolve =>
        canvas.toBlob(resolve, 'image/png', 1.0)
      );
      const file = new File([blob], 'pinboard-week.png', { type: 'image/png' });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'My Pinboard week',
          text: 'Tracked with Pinboard 🧅'
        });
      } else {
        // Fallback: download the image
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'pinboard-week.png';
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      console.error('Error generating or sharing card:', e);
    } finally {
      setIsGenerating(false);
    }
  };

  return { shareCard, isGenerating };
}
