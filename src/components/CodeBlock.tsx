/* src/components/CodeBlock.tsx
 * Thin re-export wrapper over @talon-sandbox/react CodeBlock.
 * Adds default copyable=true and an optional label above the block.
 * Usage:
 *   <CodeBlock language="bash">npm install</CodeBlock>
 *   <CodeBlock label="Config" language="json">{JSON.stringify(cfg, null, 2)}</CodeBlock>
 */
import type { ReactNode, CSSProperties } from 'react';
import { CodeBlock as TlnCodeBlock } from '@talon-sandbox/react';

interface CodeBlockProps {
  children?: ReactNode;
  language?: string;
  /** Descriptive label rendered above the code block */
  label?: string;
  /** Show copy button. Default: true */
  copyable?: boolean;
  style?: CSSProperties;
}

export function CodeBlock({ children, language, label, copyable = true, style }: CodeBlockProps) {
  return (
    <div style={style}>
      {label && (
        <div style={{
          fontSize: 11,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: 'var(--fg-3)',
          marginBottom: 6,
        }}>
          {label}
        </div>
      )}
      <TlnCodeBlock language={language} copyable={copyable}>
        {children}
      </TlnCodeBlock>
    </div>
  );
}
