import { useEffect, useRef, type RefObject } from 'react';
import { createPortal } from 'react-dom';

const focusable='a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
let scrollLocks=0;
let previousOverflow='';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  labelledBy?: string;
  label?: string;
  describedBy?: string;
  panelId?: string;
  initialFocusRef?: RefObject<HTMLElement | null>;
  overlayClassName?: string;
  panelClassName?: string;
  children: React.ReactNode;
}

export function Dialog({open,onClose,labelledBy,label,describedBy,panelId,initialFocusRef,overlayClassName='',panelClassName='',children}:DialogProps) {
  const panelRef=useRef<HTMLDivElement>(null);
  const overlayRef=useRef<HTMLDivElement>(null);
  const onCloseRef=useRef(onClose);
  onCloseRef.current=onClose;

  useEffect(()=>{
    if(!open) return;
    const restore=document.activeElement instanceof HTMLElement?document.activeElement:null;
    if(scrollLocks++===0){previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';}
    const siblings=[...document.body.children].filter(node=>node!==overlayRef.current) as HTMLElement[];
    const states=siblings.map(node=>({node,inert:node.inert,ariaHidden:node.getAttribute('aria-hidden')}));
    for(const node of siblings){node.inert=true;node.setAttribute('aria-hidden','true');}
    const frame=requestAnimationFrame(()=>{
      const target=initialFocusRef?.current??panelRef.current?.querySelector<HTMLElement>(focusable)??panelRef.current;
      target?.focus();
    });
    const keydown=(event:KeyboardEvent)=>{
      if(event.key==='Escape'){event.preventDefault();onCloseRef.current();return;}
      if(event.key!=='Tab'||!panelRef.current)return;
      const nodes=[...panelRef.current.querySelectorAll<HTMLElement>(focusable)].filter(node=>!node.closest('[hidden]'));
      if(!nodes.length){event.preventDefault();panelRef.current.focus();return;}
      const first=nodes[0]!;const last=nodes[nodes.length-1]!;
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    };
    document.addEventListener('keydown',keydown);
    return()=>{
      cancelAnimationFrame(frame);document.removeEventListener('keydown',keydown);
      for(const {node,inert,ariaHidden} of states){node.inert=inert;if(ariaHidden===null)node.removeAttribute('aria-hidden');else node.setAttribute('aria-hidden',ariaHidden);}
      if(--scrollLocks===0)document.body.style.overflow=previousOverflow;
      restore?.focus();
    };
  },[open,initialFocusRef]);

  if(!open)return null;
  return createPortal(
    <div ref={overlayRef} className={overlayClassName} onMouseDown={event=>{if(event.target===event.currentTarget)onClose();}}>
      <div id={panelId} ref={panelRef} role="dialog" aria-modal="true" aria-labelledby={labelledBy} aria-label={label} aria-describedby={describedBy} tabIndex={-1} className={panelClassName}>
        {children}
      </div>
    </div>,document.body,
  );
}
