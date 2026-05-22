// src/shared/index.ts
export { supabase } from './lib/supabaseClient'
export { ToCamelCase, ToSnakeCase } from './utils/transform'
export { default as calculateExpiryDate } from './utils/calculateExpiryDate'
export { Header } from './components/Header'
export { Layout } from './components/Layout'
export type { Branch } from './models/Branch'
export { branchService } from './services/branchService'
