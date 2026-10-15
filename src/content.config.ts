import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// Тренеры: один файл = одна страница /trenery/<имя-файла>/
const trenery = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/trenery' }),
  schema: z.object({
    name: z.string(),
    role: z.string(),
    regalia: z.array(z.string()).default([]),
    order: z.number().default(10),
    featured: z.boolean().default(false),
    photo: z.string().optional(),
  }),
});

// Бойцы (зал славы): /boytsy/<имя-файла>/
const boytsy = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/boytsy' }),
  schema: z.object({
    name: z.string(),
    rank: z.string().optional(),
    weight: z.string().optional(),
    coach: z.string().optional(),
    achievements: z.array(z.string()).default([]),
    order: z.number().default(10),
    photo: z.string().optional(),
  }),
});

// Новости, в том числе анонсы и результаты соревнований
const novosti = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/novosti' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    type: z.enum(['turnir', 'rezultaty', 'sobytie']),
    place: z.string().optional(),
    summary: z.string(),
    medals: z
      .array(z.object({ name: z.string(), place: z.number(), category: z.string().optional() }))
      .default([]),
    source: z.string().optional(),
    // Пример для показа вёрстки: на сайте помечается плашкой «Пример». Удалить перед запуском.
    example: z.boolean().default(false),
  }),
});

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    summary: z.string(),
    readingMinutes: z.number().optional(),
  }),
});

export const collections = { trenery, boytsy, novosti, blog };
