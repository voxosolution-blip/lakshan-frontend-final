// Page titles and descriptions
export const pageInfo: Record<string, { title: string; description: string }> = {
  '/': {
    title: 'Dashboard',
    description: 'Overview of your dairy operations',
  },
  '/milk': {
    title: 'Milk Collection',
    description: 'Track daily milk collection from dairy collectors',
  },
  '/salary': {
    title: 'Workers Salary Management',
    description: 'Professional payroll system with EPF/ETF calculations',
  },
  '/inventory': {
    title: 'Inventory',
    description: 'Manage raw materials, packaging, and finished products',
  },
  '/production': {
    title: 'Production',
    description: 'Manage production batches and recipes',
  },
  '/sales': {
    title: 'Sales',
    description: 'Manage sales and invoices',
  },
  '/buyers': {
    title: 'Shops Management',
    description: 'Manage shops and buyers',
  },
  '/returns': {
    title: 'Returns',
    description: 'Manage product returns and replacements',
  },
  '/payments': {
    title: 'Payments',
    description: 'Manage payments and transactions',
  },
  '/cheques': {
    title: 'Cheques',
    description: 'Manage cheques - pending, cleared, and returned',
  },
  '/expenses': {
    title: 'Expenses',
    description: 'Track daily expenses - fuel, repairs, utilities, etc.',
  },
  '/reports': {
    title: 'Reports',
    description: 'View analytics and generate reports',
  },
};

export const getPageInfo = (pathname: string) => {
  return pageInfo[pathname] || {
    title: 'Dashboard',
    description: 'Overview of your dairy operations',
  };
};


