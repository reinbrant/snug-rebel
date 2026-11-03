export interface PsgcOption {
    code: string;
    name: string;
}

const PSGC_BASE = "https://psgc.cloud/api";
const NCR_REGION_CODE = "1300000000";

let provincesCache: PsgcOption[] | null = null;
const citiesCache = new Map<string, PsgcOption[]>();
const barangaysCache = new Map<string, PsgcOption[]>();

export async function fetchProvinces(): Promise<PsgcOption[]> {
    if (provincesCache) return provincesCache;

    const res = await fetch(`${PSGC_BASE}/provinces`);
    if (!res.ok) throw new Error("Failed to load provinces from PSGC Cloud API");
    const data = (await res.json()) as Array<{ code: string; name: string }>;

    const list: PsgcOption[] = [
        { code: NCR_REGION_CODE, name: "Metro Manila (NCR)" },
        ...data
            .map((p) => ({ code: String(p.code), name: String(p.name) }))
            .sort((a, b) => a.name.localeCompare(b.name)),
    ];

    provincesCache = list;
    return list;
}

export async function fetchCitiesByProvince(provinceCode: string): Promise<PsgcOption[]> {
    if (!provinceCode) return [];
    if (citiesCache.has(provinceCode)) return citiesCache.get(provinceCode)!;

    const endpoint =
        provinceCode === NCR_REGION_CODE
            ? `${PSGC_BASE}/regions/${encodeURIComponent(NCR_REGION_CODE)}/cities-municipalities`
            : `${PSGC_BASE}/provinces/${encodeURIComponent(provinceCode)}/cities-municipalities`;

    const res = await fetch(endpoint);
    if (!res.ok) throw new Error("Failed to load cities/municipalities from PSGC Cloud API");
    const data = (await res.json()) as Array<{ code: string; name: string }>;

    const sorted = data
        .map((c) => ({ code: String(c.code), name: String(c.name) }))
        .sort((a, b) => a.name.localeCompare(b.name));

    citiesCache.set(provinceCode, sorted);
    return sorted;
}

export async function fetchBarangaysByCity(cityCode: string): Promise<PsgcOption[]> {
    if (!cityCode) return [];
    if (barangaysCache.has(cityCode)) return barangaysCache.get(cityCode)!;

    const res = await fetch(
        `${PSGC_BASE}/cities-municipalities/${encodeURIComponent(cityCode)}/barangays`,
    );
    if (!res.ok) throw new Error("Failed to load barangays from PSGC Cloud API");
    const data = (await res.json()) as Array<{ code: string; name: string }>;

    const sorted = data
        .map((b) => ({ code: String(b.code), name: String(b.name) }))
        .sort((a, b) => a.name.localeCompare(b.name));

    barangaysCache.set(cityCode, sorted);
    return sorted;
}