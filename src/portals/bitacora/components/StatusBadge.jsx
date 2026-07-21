import Badge from '../../../components/ui/Badge';
import { DOCUMENT_STATUS_META, PROGRAM_STATUS_META } from '../model';

export default function StatusBadge({ value, kind = 'program' }) {
  const source = kind === 'document' ? DOCUMENT_STATUS_META : PROGRAM_STATUS_META;
  const meta = source[value] || { label: value || 'Sin estado', tone: 'default' };
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}
