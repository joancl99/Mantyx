import { SetMetadata } from '@nestjs/common';

/**
 * Marks a route (or controller) as platform-level so it does not require the
 * authenticated user to belong to a company. Used for SUPERADMIN-only routes
 * such as company management, where the user legitimately has no companyId.
 */
export const ALLOW_NO_COMPANY_KEY = 'allowNoCompany';
export const AllowNoCompany = () => SetMetadata(ALLOW_NO_COMPANY_KEY, true);
