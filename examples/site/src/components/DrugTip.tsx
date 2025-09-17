import React from 'react';

export interface DrugTipProps {
  note: string;
}

export default function DrugTip({ note }: DrugTipProps) {
  return (
    <div className="drug-tip">
      <strong className="drug-tip__label">Tip:</strong>{' '}
      <span className="drug-tip__note">{note}</span>
    </div>
  );
}
