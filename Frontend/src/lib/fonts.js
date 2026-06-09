import { StandardFonts } from 'pdf-lib';

export const FONT_FAMILIES = ['Helvetica', 'Times', 'Courier'];

export const cssFontFamily = (family) => {
  if (family === 'Times') return "'Times New Roman', Times, serif";
  if (family === 'Courier') return "'Courier New', Courier, monospace";
  return 'Arial, Helvetica, sans-serif';
};

export const standardFontFor = (family, bold) => {
  if (family === 'Times') return bold ? StandardFonts.TimesRomanBold : StandardFonts.TimesRoman;
  if (family === 'Courier') return bold ? StandardFonts.CourierBold : StandardFonts.Courier;
  return bold ? StandardFonts.HelveticaBold : StandardFonts.Helvetica;
};
