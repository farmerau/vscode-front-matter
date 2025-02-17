import { CollectionIcon } from '@heroicons/react/outline';
import { basename, join } from 'path';
import * as React from 'react';
import { useRecoilState, useRecoilValue } from 'recoil';
import { HOME_PAGE_NAVIGATION_ID } from '../../../constants';
import { parseWinPath } from '../../../helpers/parseWinPath';
import { SearchAtom, SelectedMediaFolderAtom, SettingsAtom } from '../../state';

export interface IBreadcrumbProps {}

export const Breadcrumb: React.FunctionComponent<IBreadcrumbProps> = (props: React.PropsWithChildren<IBreadcrumbProps>) => {
  const [ selectedFolder, setSelectedFolder ] = useRecoilState(SelectedMediaFolderAtom);
  const [ , setSearchValue ] = useRecoilState(SearchAtom);
  const [ folders, setFolders ] = React.useState<string[]>([]);
  const settings = useRecoilValue(SettingsAtom);

  const updateFolder = (folder: string) => {
    setSearchValue('');
    setSelectedFolder(folder);
  }

  React.useEffect(() => {
    if (!settings) {
      return;
    }

    const { wsFolder, staticFolder, contentFolders } = settings;

    const isValid = (folderPath: string) => {
      if (staticFolder) {
        const staticPath = parseWinPath(join(wsFolder, staticFolder)) as string;
        const relPath = folderPath.replace(staticPath, '') as string;

        if (relPath.length > 1 && folderPath.startsWith(staticPath)) {
          return true;
        } else if (relPath.length === 0) {
          return false;
        }
      }

      for (let i = 0; i < contentFolders.length; i++) {
        const folder = contentFolders[i];
        const contentFolder = parseWinPath(folder.path) as string;
        const relContentPath = folderPath.replace(contentFolder, '');
        return relContentPath.length > 1 && folderPath.startsWith(contentFolder);
      }

      return false;
    };

    if (!selectedFolder) {
      setFolders([]);
    } else {
      const relPath = parseWinPath(selectedFolder.replace(parseWinPath(settings.wsFolder) as string, '')) as string;
      const folderParts = relPath.split('/').filter(f => f);
      const allFolders: string[] = [];
      let previousFolder = parseWinPath(settings.wsFolder) as string;

      for (const part of folderParts) {
        const folder = join(previousFolder, part);
        if (isValid(folder)) {
          allFolders.push(folder);
        }
        previousFolder = folder;
      }
  
      setFolders(allFolders);
    }
  }, [selectedFolder, settings]);
  
  return (
    <ol role="list" className="flex space-x-4 px-5 flex-1">
      <li className="flex">
        <div className="flex items-center">
          <button onClick={() => setSelectedFolder(HOME_PAGE_NAVIGATION_ID)} className="text-gray-500 hover:text-gray-600 dark:text-whisper-900 dark:hover:text-whisper-500">
            <CollectionIcon className="flex-shrink-0 h-5 w-5" aria-hidden="true" />
            <span className="sr-only">Home</span>
          </button>
        </div>
      </li>

      {folders.map((folder) => (
        <li key={folder} className="flex">
          <div className="flex items-center">
            <svg
              className="flex-shrink-0 h-5 w-5 text-gray-300 dark:text-whisper-900"
              xmlns="http://www.w3.org/2000/svg"
              fill="currentColor"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path d="M5.555 17.776l8-16 .894.448-8 16-.894-.448z" />
            </svg>
            <button
              onClick={() => updateFolder(folder)}
              className="ml-4 text-sm font-medium text-gray-500 hover:text-gray-600 dark:text-whisper-900 dark:hover:text-whisper-500"
            >
              {basename(folder)}
            </button>
          </div>
        </li>
      ))}
    </ol>
  );
};