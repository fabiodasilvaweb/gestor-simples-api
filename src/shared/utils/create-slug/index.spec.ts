import { describe, expect, it } from 'vitest'
import { createSlug } from '../create-slug'

describe('createSlug', () => {
  it('should convert text to lowercase', () => {
    expect(createSlug('HELLO WORLD')).toBe('hello-world')
  })

  it('should remove accents', () => {
    expect(createSlug('São Paulo')).toBe('sao-paulo')
  })

  it('should remove special characters', () => {
    expect(createSlug('Olá, mundo!')).toBe('ola-mundo')
  })

  it('should replace multiple spaces with a single dash', () => {
    expect(createSlug('Hello    World')).toBe('hello-world')
  })

  it('should trim spaces at the beginning and end', () => {
    expect(createSlug('   Hello World   ')).toBe('hello-world')
  })

  it('should handle mixed transformations', () => {
    expect(createSlug('  Gestão Simples 2026! ')).toBe('gestao-simples-2026')
  })

  it('should return empty string when input is empty', () => {
    expect(createSlug('')).toBe('')
  })

  it('should return empty string when input contains only spaces', () => {
    expect(createSlug('     ')).toBe('')
  })

  it('should remove symbols and keep numbers', () => {
    expect(createSlug('Produto #123 @ Promoção')).toBe('produto-123-promocao')
  })

  it('should handle single word', () => {
    expect(createSlug('Fastify')).toBe('fastify')
  })
})
