import React from 'react';
import zarcoLogo from './assets/zarco_logo_1_no_bg.png';
import './zarcoFooter.css';

export interface ZarcoFooterProps {
  lang?: 'pt' | 'en' | string;
  className?: string;
}

export default function ZarcoFooter({ lang = 'en', className = '' }: ZarcoFooterProps) {
  return (
    <div className={`zarco-footer ${className}`.trim()}>
      <span className="zarco-footer-text">
        {lang === 'pt'
          ? 'Desenvolvido por Zarco Studios'
          : 'Developed by Zarco Studios'}
      </span>
      <a
        href="https://zarcostudios.com/"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Zarco Studios"
        className="zarco-footer-link"
      >
        <img
          className="zarco-footer-logo"
          src={zarcoLogo}
          alt="Zarco Studios"
          loading="lazy"
        />
      </a>
    </div>
  );
}
