import { SETTINGS_CONTENT_STATIC_FOLDERS, SETTING_DATE_FIELD, SETTING_PREVIEW_HOST, SETTING_PREVIEW_PATHNAME, SETTING_SEO_DESCRIPTION_FIELD } from './../constants/settings';
import { ArticleHelper } from './../helpers/ArticleHelper';
import { join } from "path";
import { ColorThemeKind, commands, env, ThemeColor, Uri, ViewColumn, Webview, WebviewOptions, WebviewPanel, WebviewPanelOptions, window, workspace } from "vscode";
import { SettingsHelper } from '../helpers';
import { PreviewSettings } from '../models';
import { format } from 'date-fns';
import { CONTEXT } from '../constants/context';
import { Folders } from './Folders';
import { getNonce } from '../helpers/getNonce';
import { DashboardCommand } from '../pagesView/DashboardCommand';
import { DashboardMessage } from '../pagesView/DashboardMessage';
import { Page } from '../pagesView/models/Page';
import { openFileInEditor } from '../helpers/openFileInEditor';
import { COMMAND_NAME } from '../constants/Extension';
import { Template } from './Template';


export class Dashboard {
  private static webview: WebviewPanel | null = null;
  private static isDisposed: boolean = true;

  /** 
   * Init the dashboard
   */
  public static async init() {
    const folders = Folders.get();
    await commands.executeCommand('setContext', CONTEXT.canOpenDashboard, folders && folders.length > 0);
  }

  public static get isOpen(): boolean {
    return !Dashboard.isDisposed;
  }

  public static reveal() {
    if (Dashboard.webview) {
      Dashboard.webview.reveal();
    }
  }
  
  /**
   * Open the markdown preview in the editor
   */
  public static async open(extensionPath: string) {

    // Create the preview webview
    Dashboard.webview = window.createWebviewPanel(
      'frontMatterDashboard',
      'FrontMatter Dashboard',
      ViewColumn.One,
      {
        enableScripts: true
      }
    );

    Dashboard.isDisposed = false;

    Dashboard.webview.iconPath = {
      dark: Uri.file(join(extensionPath, 'assets/frontmatter-dark.svg')),
      light: Uri.file(join(extensionPath, 'assets/frontmatter.svg'))
    };

    Dashboard.webview.webview.html = Dashboard.getWebviewContent(Dashboard.webview.webview, Uri.parse(extensionPath));

    Dashboard.webview.onDidChangeViewState(() => {
      if (this.webview?.visible) {
        console.log(`Dashboard opened`);
      }
    });

    Dashboard.webview.onDidDispose(() => {
      Dashboard.isDisposed = true;
    });

    Dashboard.webview.webview.onDidReceiveMessage(async (msg) => {
      switch(msg.command) {
        case DashboardMessage.getData:
          Dashboard.getSettings();
          Dashboard.getPages();
          break;
        case DashboardMessage.openFile:
          openFileInEditor(msg.data);
          break;
        case DashboardMessage.createContent:
          await commands.executeCommand(COMMAND_NAME.createContent);
          break;
      }
    });
  }

  private static async getSettings() { 
    Dashboard.postWebviewMessage({
      command: DashboardCommand.settings,
      data: {
        folders: Folders.get(),
        initialized: await Template.isInitialized()
      }
    });
  }

  private static async getPages() {
    const config = SettingsHelper.getConfig();
    const wsFolders = workspace.workspaceFolders;
    const crntWsFolder = wsFolders && wsFolders.length > 0 ? wsFolders[0] : null;

    const descriptionField = config.get(SETTING_SEO_DESCRIPTION_FIELD) as string || "description";
    const dateField = config.get(SETTING_DATE_FIELD) as string || "date";
    const staticFolder = config.get<string>(SETTINGS_CONTENT_STATIC_FOLDERS);

    const folderInfo = await Folders.getInfo();
    const pages: Page[] = [];

    if (folderInfo) {
      for (const folder of folderInfo) {
        for (const file of folder.lastModified) {
          if (file.fileName.endsWith(`.md`) || file.fileName.endsWith(`.mdx`)) {
            const article = ArticleHelper.getFrontMatterByPath(file.filePath);

            if (article?.data.title) {
              const page: Page = {
                fmGroup: folder.title,
                fmModified: file.mtime,
                fmFilePath: file.filePath,
                fmFileName: file.fileName,
                title: article?.data.title,
                slug: article?.data.slug,
                date: article?.data[dateField] || "",
                draft: article?.data.draft,
                description: article?.data[descriptionField] || "",
              };
    
              if (article?.data.preview && crntWsFolder) {
                const previewPath = join(crntWsFolder.uri.fsPath, staticFolder || "", article?.data.preview);
                const previewUri = Uri.file(previewPath);
                const preview = Dashboard.webview?.webview.asWebviewUri(previewUri);
                page.preview = preview?.toString() || "";
              }
    
              pages.push(page);
            }
          }
        }
      }
    }

    Dashboard.postWebviewMessage({
      command: DashboardCommand.pages,
      data: pages
    });
  }

  /**
   * Post data to the dashboard
   * @param msg 
   */
  private static postWebviewMessage(msg: { command: DashboardCommand, data?: any }) {
    Dashboard.webview?.webview.postMessage(msg);
  }
  
  /**
   * Retrieve the webview HTML contents
   * @param webView 
   */
  private static getWebviewContent(webView: Webview, extensionPath: Uri): string {
    const scriptUri = webView.asWebviewUri(Uri.joinPath(extensionPath, 'dist', 'pages.js'));

    const nonce = getNonce();

    return `
      <!DOCTYPE html>
      <html lang="en" style="width:100%;height:100%;margin:0;padding:0;">
      <head>
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${`vscode-file://vscode-app`} ${webView.cspSource} https://api.visitorbadge.io 'self' 'unsafe-inline'; script-src 'nonce-${nonce}'; style-src ${webView.cspSource} 'self' 'unsafe-inline'; font-src ${webView.cspSource}">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">

        <title>Front Matter Dashboard</title>
      </head>
      <body style="width:100%;height:100%;margin:0;padding:0;" class="bg-gray-100 text-vulcan-500 dark:bg-vulcan-500 dark:text-whisper-500">
        <div id="app" style="width:100%;height:100%;margin:0;padding:0;"></div>

        <img style="display:none" src="https://api.visitorbadge.io/api/combined?user=estruyf&repo=frontmatter-usage&countColor=%23263759" alt="Daily usage" />

        <script nonce="${nonce}" src="${scriptUri}"></script>
      </body>
      </html>
    `;
  }
}