export type DomainType = 'cname' | 'apex';

export type DomainStatus = 
  | 'pending' 
  | 'verification_required' 
  | 'verified' 
  | 'active' 
  | 'ssl_pending' 
  | 'error' 
  | 'disabled';

export type SslStatus = 'active' | 'pending' | 'failed' | 'unverified';

export type DnsRecordType = 'CNAME' | 'A' | 'TXT';

export interface DomainRecord {
  id: string;
  restaurantId: string;
  domain: string;
  type: DomainType;
  status: DomainStatus;
  isPrimary: boolean;
  verificationToken: string;
  verifiedAt?: string;
  sslStatus: SslStatus;
  dnsRecordType: DnsRecordType;
  dnsTarget: string;
  lastCheckedAt?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}
