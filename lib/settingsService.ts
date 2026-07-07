import { supabase } from './supabaseClient';

export interface CompanySettings {
  companyName: string;
  companyPhone: string;
  companyAddress: string;
}

const DEFAULTS: CompanySettings = {
  companyName: 'SAMRUQ Qurylys',
  companyPhone: '',
  companyAddress: '',
};

export async function getCompanySettings(): Promise<CompanySettings> {
  try {
    const { data } = await supabase
      .from('company_settings')
      .select('company_name, company_phone, company_address')
      .eq('id', 1)
      .single();

    if (!data) return DEFAULTS;
    return {
      companyName: data.company_name ?? DEFAULTS.companyName,
      companyPhone: data.company_phone ?? '',
      companyAddress: data.company_address ?? '',
    };
  } catch {
    return DEFAULTS;
  }
}

export async function saveCompanySettings(s: CompanySettings): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from('company_settings')
    .upsert(
      { id: 1, company_name: s.companyName, company_phone: s.companyPhone, company_address: s.companyAddress },
      { onConflict: 'id' },
    );
  return { error: error ? new Error(error.message) : null };
}
