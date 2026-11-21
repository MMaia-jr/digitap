// @vitest-environment jsdom
import {cleanup, render, screen} from '@testing-library/react';
import {afterEach, expect, it} from 'vitest';
import {RealizationPhoto} from '../../src/components/RealizationPhoto';

afterEach(cleanup);

it('labels a documentary URL as a reference without presenting it as a photo', () => {
  const url = 'https://example.invalid/ata-oficina';
  render(<RealizationPhoto url={url}/>);
  expect(screen.getByRole('link', {name: /Abrir referência original/}).getAttribute('href')).toBe(url);
  expect(screen.queryByRole('img')).toBeNull();
});

it('keeps the photo label for an image URL', () => {
  render(<RealizationPhoto url="https://example.invalid/oficina.jpg"/>);
  expect(screen.getByRole('link', {name: /Abrir foto original/})).toBeTruthy();
  expect(screen.getByRole('img')).toBeTruthy();
});
