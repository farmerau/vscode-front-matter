import { TextEditorDecorationType } from 'vscode';
import { CancellationToken, FoldingContext, FoldingRange, FoldingRangeKind, FoldingRangeProvider, Range, TextDocument, window, Position } from 'vscode';
import { SETTINGS_CONTENT_FRONTMATTER_HIGHLIGHT } from '../constants';
import { Settings } from '../helpers';
import { FrontMatterDecorationProvider } from './FrontMatterDecorationProvider';

export class MarkdownFoldingProvider implements FoldingRangeProvider {
  private static start: number | null = null;
  private static end: number | null = null;
  private static endLine: number | null = null;
  private static decType: TextEditorDecorationType | null = null;

  public async provideFoldingRanges(document: TextDocument, context: FoldingContext, token: CancellationToken): Promise<FoldingRange[]> {
    const ranges: FoldingRange[] = [];

    const range = MarkdownFoldingProvider.getFrontMatterRange(document);
    if (range) {
      MarkdownFoldingProvider.start = null;
      MarkdownFoldingProvider.end = null;
      MarkdownFoldingProvider.endLine = null;

      MarkdownFoldingProvider.triggerHighlighting();

      ranges.push(new FoldingRange(range.start.line, range.end.line, FoldingRangeKind.Region));
    }

    return ranges;
  }

  public static triggerHighlighting() {
    const fmHighlight = Settings.get<boolean>(SETTINGS_CONTENT_FRONTMATTER_HIGHLIGHT);

    const range = this.getFrontMatterRange();

    if (range) {
      if (MarkdownFoldingProvider.decType !== null) {
        MarkdownFoldingProvider.decType.dispose();
      }

      if (fmHighlight) {
        MarkdownFoldingProvider.decType = new FrontMatterDecorationProvider().get();
        window.activeTextEditor?.setDecorations(MarkdownFoldingProvider.decType, [range]);
      }
    }
  }

  /**
   * Retrieve the range of the current Front Matter page
   * @param document 
   * @returns 
   */
  public static getFrontMatterRange(document?: TextDocument) {
    if (document) {
      const lines = document.getText().split('\n');

      let start = null;
      let end = null;
      let endLine = null;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.startsWith('---')) {
          if (i === 0 && start === null) {
            start = i;
          } else if (start !== null && end === null) {
            end = i;
            endLine = line.length;

            MarkdownFoldingProvider.triggerHighlighting();

            return new Range(new Position(start, 0), new Position(end, endLine));
          }
        }
      }
    }

    if (MarkdownFoldingProvider.start !== null && MarkdownFoldingProvider.end !== null && MarkdownFoldingProvider.endLine !== null) {
      const range = new Range(new Position(MarkdownFoldingProvider.start, 0), new Position(MarkdownFoldingProvider.end, MarkdownFoldingProvider.endLine));

      return range;
    }

    return null;
  }
}