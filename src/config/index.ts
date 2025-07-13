/**
 * Global configuration loader for CaseThread.
 * Centralizes environment-variable parsing so we have a single source of truth.
 */

import * as dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Future configuration options can be added here
}; 