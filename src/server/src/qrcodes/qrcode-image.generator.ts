export function generatePlaceholderQrcode(scene: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300">
  <rect width="300" height="300" fill="#f0f0f0"/>
  <rect x="10" y="10" width="280" height="280" fill="#fff" stroke="#333" stroke-width="5"/>
  <text x="150" y="120" text-anchor="middle" font-size="18" fill="#333">微信小程序码占位图</text>
  <text x="150" y="150" text-anchor="middle" font-size="12" fill="#666">scene: ${escapeXml(scene)}</text>
  <text x="150" y="180" text-anchor="middle" font-size="12" fill="#999">微信配置就绪后替换为真实小程序码</text>
</svg>`;
  const base64 = Buffer.from(svg).toString('base64');
  return `data:image/svg+xml;base64,${base64}`;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
