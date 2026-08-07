/** 从电商/快递平台复制的整段地址文本中识别收件信息 */

export interface ParsedAddress {
  recipient: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  address: string;
}

const PROVINCES: { name: string; aliases: string[] }[] = [
  { name: '北京市', aliases: ['北京'] },
  { name: '天津市', aliases: ['天津'] },
  { name: '上海市', aliases: ['上海'] },
  { name: '重庆市', aliases: ['重庆'] },
  { name: '河北省', aliases: ['河北'] },
  { name: '山西省', aliases: ['山西'] },
  { name: '辽宁省', aliases: ['辽宁'] },
  { name: '吉林省', aliases: ['吉林'] },
  { name: '黑龙江省', aliases: ['黑龙江'] },
  { name: '江苏省', aliases: ['江苏'] },
  { name: '浙江省', aliases: ['浙江'] },
  { name: '安徽省', aliases: ['安徽'] },
  { name: '福建省', aliases: ['福建'] },
  { name: '江西省', aliases: ['江西'] },
  { name: '山东省', aliases: ['山东'] },
  { name: '河南省', aliases: ['河南'] },
  { name: '湖北省', aliases: ['湖北'] },
  { name: '湖南省', aliases: ['湖南'] },
  { name: '广东省', aliases: ['广东'] },
  { name: '海南省', aliases: ['海南'] },
  { name: '四川省', aliases: ['四川'] },
  { name: '贵州省', aliases: ['贵州'] },
  { name: '云南省', aliases: ['云南'] },
  { name: '陕西省', aliases: ['陕西'] },
  { name: '甘肃省', aliases: ['甘肃'] },
  { name: '青海省', aliases: ['青海'] },
  { name: '台湾省', aliases: ['台湾'] },
  { name: '内蒙古自治区', aliases: ['内蒙古'] },
  { name: '广西壮族自治区', aliases: ['广西'] },
  { name: '西藏自治区', aliases: ['西藏'] },
  { name: '宁夏回族自治区', aliases: ['宁夏'] },
  { name: '新疆维吾尔自治区', aliases: ['新疆'] },
  { name: '香港特别行政区', aliases: ['香港'] },
  { name: '澳门特别行政区', aliases: ['澳门'] },
];

const MUNICIPALITY: Record<string, boolean> = {
  '北京市': true,
  '天津市': true,
  '上海市': true,
  '重庆市': true,
};

/** 不能当姓名的词（行政区划简称等） */
const NOT_NAME: Record<string, boolean> = {};
PROVINCES.forEach(function (p) {
  NOT_NAME[p.name] = true;
  p.aliases.forEach(function (a) {
    NOT_NAME[a] = true;
  });
});

const LABEL_RECIPIENT = /(?:收件人|收货人|姓名|联系人)\s*[:：\s]\s*([^\s,，;；\n]{1,20})/;
const LABEL_PHONE = /(?:手机号|手机|电话|联系电话|联系方式)\s*[:：\s]\s*(1[3-9]\d{9})/;
const LABEL_ADDRESS = /(?:收货地址|详细地址|地址|所在地区)\s*[:：]\s*/;

function normalizeText(raw: string): string {
  return String(raw || '')
    .replace(/[\r\n\t\u00a0\u3000]+/g, ' ')
    .replace(/[，,;；|]+/g, ' ')
    .replace(/ {2,}/g, ' ')
    .trim();
}

/** 去掉空白后再做省市区切分，避免「省 市」空格导致截断 */
function compact(text: string): string {
  return text.replace(/\s+/g, '');
}

function extractPhone(text: string): { phone: string; rest: string } {
  const labeled = text.match(LABEL_PHONE);
  if (labeled) {
    return { phone: labeled[1], rest: text.replace(labeled[0], ' ').trim() };
  }
  const m = text.match(/1[3-9]\d{9}/);
  if (!m || m.index == null) {
    return { phone: '', rest: text };
  }
  return {
    phone: m[0],
    rest: (text.slice(0, m.index) + ' ' + text.slice(m.index + 11)).trim(),
  };
}

function isLikelyName(name: string): boolean {
  if (!name || name.length < 2 || name.length > 4) return false;
  if (NOT_NAME[name]) return false;
  if (/[省市区县市州盟旗乡]/.test(name)) return false;
  return /^[\u4e00-\u9fa5·]+$/.test(name);
}

function extractRecipient(text: string): { recipient: string; rest: string } {
  const labeled = text.match(LABEL_RECIPIENT);
  if (labeled && isLikelyName(labeled[1].trim())) {
    return {
      recipient: labeled[1].trim(),
      rest: text.replace(labeled[0], ' ').trim(),
    };
  }

  // 文首姓名：张三 / 欧阳锋
  const head = text.match(/^([\u4e00-\u9fa5·]{2,4})(?:\s+|$)/);
  if (head && isLikelyName(head[1])) {
    return { recipient: head[1], rest: text.slice(head[0].length).trim() };
  }

  // 文末姓名（地址在前时）
  const tail = text.match(/\s([\u4e00-\u9fa5·]{2,4})$/);
  if (tail && isLikelyName(tail[1])) {
    return { recipient: tail[1], rest: text.slice(0, tail.index).trim() };
  }

  return { recipient: '', rest: text };
}

function findProvince(
  text: string,
): { province: string; index: number; length: number } | null {
  const candidates: { province: string; index: number; length: number }[] = [];
  for (let i = 0; i < PROVINCES.length; i++) {
    const p = PROVINCES[i];
    const names = [p.name].concat(p.aliases).sort(function (a, b) {
      return b.length - a.length;
    });
    for (let j = 0; j < names.length; j++) {
      const n = names[j];
      const idx = text.indexOf(n);
      if (idx >= 0) {
        candidates.push({ province: p.name, index: idx, length: n.length });
        break;
      }
    }
  }
  if (!candidates.length) return null;
  candidates.sort(function (a, b) {
    return a.index - b.index || b.length - a.length;
  });
  return candidates[0];
}

/**
 * 从「省」之后的字符串切 市 / 区 / 详细。
 * 详细地址 = 区（县）之后的全部剩余，包含街道/镇/路/门牌，不再二次截断。
 */
function splitAfterProvince(
  province: string,
  afterProvRaw: string,
): { city: string; district: string; address: string } {
  // 省市区匹配用无空白串，避免「西安 市」切错；详细地址从原始 after 里按长度切
  const after = compact(afterProvRaw);
  if (!after) {
    return { city: '', district: '', address: '' };
  }

  let city = '';
  let district = '';
  let rest = after;

  if (MUNICIPALITY[province]) {
    city = province;
    if (rest.indexOf('市') === 0) {
      rest = rest.slice(1);
    }
  } else {
    // 市/州/盟：取到第一个「市|自治州|地区|盟」
    const cityMatch = rest.match(/^([\u4e00-\u9fa5]{1,12}(?:自治州|地区|盟|市))/);
    if (cityMatch) {
      city = cityMatch[1];
      rest = rest.slice(cityMatch[0].length);
    }
  }

  // 区/县：优先匹配「…区|…县|…旗|…新城|…园区|…开发区」，避免把「街道」吃进区
  // 注意：不要用「市」作为区后缀优先（会与县级市混淆时再考虑）
  const distMatch = rest.match(
    /^([\u4e00-\u9fa5]{1,16}(?:开发区|自治县|新区|园区|矿区|林区|景区|新城|区|县|旗))/,
  );
  if (distMatch) {
    district = distMatch[1];
    rest = rest.slice(distMatch[0].length);
  } else {
    // 县级市：xx市（仅当后面还有内容时）
    const countyCity = rest.match(/^([\u4e00-\u9fa5]{1,10}市)(?=[\u4e00-\u9fa5])/);
    if (countyCity) {
      district = countyCity[1];
      rest = rest.slice(countyCity[0].length);
    }
  }

  // rest 即为详细地址（街道/镇/乡/路/号等全部保留）
  return { city, district, address: rest };
}

function extractRegion(text: string): {
  province: string;
  city: string;
  district: string;
  address: string;
  /** 省之前残留（可能是姓名） */
  beforeProvince: string;
} {
  // 若带「地址：」标签，从标签后开始取行政区，标签前留给姓名
  let work = text;
  let beforeLabel = '';
  const labelAt = work.search(LABEL_ADDRESS);
  if (labelAt >= 0) {
    const m = work.match(LABEL_ADDRESS);
    if (m && m.index != null) {
      beforeLabel = work.slice(0, m.index).trim();
      work = work.slice(m.index + m[0].length).trim();
    }
  }

  const prov = findProvince(work);
  if (!prov) {
    // 整段都找不到省：全部当详细地址
    return {
      province: '',
      city: '',
      district: '',
      address: compact(work) || work.trim(),
      beforeProvince: beforeLabel,
    };
  }

  const beforeProvince = (beforeLabel + ' ' + work.slice(0, prov.index)).trim();
  const afterProv = work.slice(prov.index + prov.length);
  const split = splitAfterProvince(prov.province, afterProv);

  return {
    province: prov.province,
    city: split.city,
    district: split.district,
    address: split.address,
    beforeProvince,
  };
}

export function parseAddressText(raw: string): ParsedAddress {
  let text = normalizeText(raw || '');
  if (!text) {
    return { recipient: '', phone: '', province: '', city: '', district: '', address: '' };
  }

  const phonePart = extractPhone(text);
  text = normalizeText(phonePart.rest);

  // 先取姓名并移出文本，避免粘在详细地址末尾（如「…1号刘桐」）
  const namePart = extractRecipient(text);
  let recipient = namePart.recipient;
  text = normalizeText(namePart.rest);

  const region = extractRegion(text);

  if (!recipient && region.beforeProvince) {
    const fromBefore = extractRecipient(region.beforeProvince);
    if (fromBefore.recipient) {
      recipient = fromBefore.recipient;
    }
  }

  let address = region.address || '';
  // 去掉详细地址里误粘的姓名
  if (recipient && address) {
    if (address.slice(-recipient.length) === recipient) {
      address = address.slice(0, address.length - recipient.length);
    }
    address = address.split(recipient).join('');
  }
  address = address.trim();

  return {
    recipient: recipient,
    phone: phonePart.phone,
    province: region.province,
    city: region.city,
    district: region.district,
    address: address,
  };
}

export function hasUsefulParse(parsed: ParsedAddress): boolean {
  return !!(
    parsed.phone ||
    parsed.province ||
    parsed.city ||
    parsed.district ||
    parsed.address ||
    parsed.recipient
  );
}
