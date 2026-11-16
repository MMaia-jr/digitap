import { ActionLibrary } from '../../components/ActionLibrary';
import { actionTemplates } from '../../lib/actions/catalog';

export const dynamic = 'force-static';

export default function ActionLibraryPage() {
  return <ActionLibrary templates={actionTemplates} />;
}
