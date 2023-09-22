import { IconFileImport, IconFileUpload } from '@tabler/icons-react';
import { FC } from 'react';

import { useTranslation } from 'next-i18next';

import { SupportedExportFormats } from '@/types/export';

import { SidebarButton } from '../Sidebar/SidebarButton';

interface ImportDataProps {
  onImportFiles: (data: FormData) => void;
}

interface ImportProps {
  onImport: (data: SupportedExportFormats) => void;
}

export const Import: FC<ImportProps> = ({ onImport }) => {
  const { t } = useTranslation('sidebar');
  return (
    <>
      <input
        id="import-file"
        className="sr-only"
        tabIndex={-1}
        type="file"
        accept=".json"
        onChange={(e) => {
          if (!e.target.files?.length) return;

          const file = e.target.files[0];
          const reader = new FileReader();
          reader.onload = (e) => {
            let json = JSON.parse(e.target?.result as string);
            onImport(json);
          };
          reader.readAsText(file);
        }}
      />

      <SidebarButton
        text={t('Import data')}
        icon={<IconFileImport size={18} />}
        onClick={() => {
          const importFile = document.querySelector(
            '#import-file',
          ) as HTMLInputElement;
          if (importFile) {
            importFile.click();
          }
        }}
      />
    </>
  );
};

export const ImportFiles: FC<ImportDataProps> = ({ onImportFiles }) => {
  const { t } = useTranslation('sidebar');
  return (
    <>
      <input
        id="import-files"
        className="sr-only"
        tabIndex={-1}
        type="file"
        accept=".pdf,.txt"
        onChange={(e) => {
          if (!e.target.files?.length) return;

          const file = e.target.files[0];
          const formData = new FormData();
          formData.append('file', file);
          onImportFiles(formData)
        }}
      />

      <SidebarButton
        text={t('Import files')}
        icon={<IconFileUpload size={18} />}
        onClick={() => {
          const importFile = document.querySelector(
            '#import-files',
          ) as HTMLInputElement;
          if (importFile) {
            importFile.click();
          }
        }}
      />
    </>
  );
};