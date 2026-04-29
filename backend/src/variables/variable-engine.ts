import { Injectable } from '@nestjs/common';

@Injectable()
export class VariableEngine {
  private filters: Record<string, (v: string) => string> = {
    moeda:    (v) => `R$ ${parseFloat(v || '0').toFixed(2).replace('.', ',')}`,
    upper:    (v) => v.toUpperCase(),
    lower:    (v) => v.toLowerCase(),
    primeiro: (v) => v.split(' ')[0],
  };

  resolve(template: string, lead: Record<string, string>): string {
    return template.replace(/\{\{(\w+)(?:\|(\w+))?\}\}/g, (_, key, filter) => {
      const value = key === 'primeiro_nome'
        ? (lead['nome'] || lead['fullName'] || lead['full_name'] || '').split(' ')[0]
        : (lead[key] ?? '');

      if (filter && this.filters[filter]) {
        return this.filters[filter](value);
      }
      return value;
    });
  }

  extractVariables(template: string): string[] {
    const matches = [...template.matchAll(/\{\{(\w+)(?:\|(\w+))?\}\}/g)];
    return [...new Set(matches.map(m => m[1]))];
  }
}
