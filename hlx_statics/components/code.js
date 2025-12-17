import { getMetadata } from "../scripts/scripts.js";

export default function decoratePreformattedCode(block) {
  const pre = block.querySelector('pre');
  const code = block.querySelector('code');

  if(pre && getMetadata('template') === "documentation"){
    const processClasses = (element) => {
      element.className = Array.from(element.classList).map(className => {
        let cleanClassName = className;

        const dataLineMatch = className.match(/data-line="([^"]*)"/);
        if(dataLineMatch) {
          pre.setAttribute('data-line', dataLineMatch[1]);
          code?.setAttribute('data-line', dataLineMatch[1]);
          cleanClassName = cleanClassName.replace(/-data-line="[^"]*"/, '');
        }

        const dataLineOffsetMatch = className.match(/data-line-offset="([^"]*)"/);
        if(dataLineOffsetMatch) {
          pre.setAttribute('data-line-offset', dataLineOffsetMatch[1]);
          code?.setAttribute('data-line-offset', dataLineOffsetMatch[1]);
          cleanClassName = cleanClassName.replace(/-data-line-offset="[^"]*"/, '');
        }

        if(className.includes('disableLineNumbers')) {
          pre.classList.add('disableLineNumbers');
          cleanClassName = cleanClassName.replace(/-disableLineNumbers/, '');
        }
        
        return cleanClassName;
      }).filter(className => className.trim()).join(' ');
    };
    
    processClasses(pre);
    code && processClasses(code);
  }

  if (pre?.classList.contains("disableLineNumbers")) {
    pre?.classList.add('no-line-numbers');
  }
  else {
    pre?.classList.add('line-numbers');
  }
  
  const dataLine = code.getAttribute('data-line');
  if (dataLine) {
    pre.setAttribute('data-line', dataLine);
  }

  const dataLineOffset = code.getAttribute('data-line-offset');
  if (dataLineOffset) {
    pre.setAttribute('data-line-offset', dataLineOffset);
  } 
  
  if (!code.className.match(/language-/)) {
    code.classList.add('language-none');
  }

  code.setAttribute('data-prismjs-copy', 'Copy');
  code.setAttribute('data-prismjs-copy-success', 'Copied to your clipboard');
  code.setAttribute('data-prismjs-copy-timeout', '3000');
}
