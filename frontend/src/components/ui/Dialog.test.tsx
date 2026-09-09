import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useRef, useState } from 'react';
import { describe, expect, it } from 'vitest';
import { Dialog } from './Dialog.js';

function Fixture(){const[open,setOpen]=useState(false);const input=useRef<HTMLInputElement>(null);return <><button onClick={()=>setOpen(true)}>Open</button><main data-testid="background">Background</main><Dialog open={open} onClose={()=>setOpen(false)} label="Test dialog" initialFocusRef={input}><input ref={input} aria-label="First"/><button>Last</button></Dialog></>}

describe('Dialog',()=>{
  it('isolates background, manages focus, traps Tab, closes on Escape, and restores focus',async()=>{
    render(<Fixture/>);const trigger=screen.getByRole('button',{name:'Open'});trigger.focus();fireEvent.click(trigger);
    await waitFor(()=>expect(screen.getByLabelText('First')).toHaveFocus());
    expect(document.body.style.overflow).toBe('hidden');expect(document.querySelector('#root')?.getAttribute('aria-hidden')??screen.getByTestId('background').closest('div')?.getAttribute('aria-hidden')).toBe('true');
    const last=screen.getByRole('button',{name:'Last'});last.focus();fireEvent.keyDown(document,{key:'Tab'});expect(screen.getByLabelText('First')).toHaveFocus();
    fireEvent.keyDown(document,{key:'Escape'});expect(screen.queryByRole('dialog')).not.toBeInTheDocument();expect(trigger).toHaveFocus();
  });
});
