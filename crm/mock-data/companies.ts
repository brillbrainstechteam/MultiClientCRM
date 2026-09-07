import type { Company } from './types';

/** Company records referenced by contacts (separate-entity model, 2.2). */
export const companies: Company[] = [
  {
    id: 'company_shah_textiles',
    name: 'Shah Textiles',
    city: 'New Delhi',
    segment: 'Wholesale apparel',
    branchId: 'branch_delhi',
    primaryContactId: 'contact_rahul_shah',
  },
  {
    id: 'company_verma_interiors',
    name: 'Verma Interiors',
    city: 'Gurugram',
    segment: 'Interior design',
    branchId: 'branch_delhi',
    primaryContactId: 'contact_arjun_verma',
  },
  {
    id: 'company_desai_exports',
    name: 'Desai Exports',
    city: 'Thane',
    segment: 'Export house',
    branchId: 'branch_mumbai',
    primaryContactId: 'contact_kavita_desai',
  },
  {
    id: 'company_qureshi_motors',
    name: 'Qureshi Motors',
    city: 'Noida',
    segment: 'Automotive dealer',
    branchId: 'branch_delhi',
    primaryContactId: 'contact_imran_qureshi',
  },
];

export function findCompany(companyId: string): Company | undefined {
  return companies.find((company) => company.id === companyId);
}
