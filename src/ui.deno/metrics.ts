/** Fixed sizes, so the window height follows the content without measuring it (RFC-0007/R2). */
export const width = 600
export const rowHeight = 52
/** gpui-native's default top margin of a layer-shell surface. */
export const layerMarginTop = 160
/** Space kept between the window and the bottom of the display. */
export const screenMargin = 16
export const iconSize = 36
// RFC-0007/R6: 24 pt. GPUI sizes are logical px, which the platform scales like CSS px (96 per inch).
export const inputFontSize = 24 * 96 / 72
// RFC-0007/R7; a list needs gpui-native patch 0004. `.SystemUIFont` is GPUI's name for the system UI font.
export const fontFamily = 'Noto Sans CJK TC, LiHei Pro, .SystemUIFont'
export const inputPadding = 8
// GPUI clips the input to its line: it must hold the CJK font's ascent + descent (~1.45 em).
export const inputLineHeight = 48
export const inputHeight = 2 * inputPadding + inputLineHeight
