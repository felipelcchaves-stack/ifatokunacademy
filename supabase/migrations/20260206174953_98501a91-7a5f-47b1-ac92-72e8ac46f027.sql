
-- Atualizar a org principal (ifatokun) com o prompt Ifá/Yoruba completo
UPDATE organizations 
SET branding = jsonb_set(
  COALESCE(branding, '{}'::jsonb),
  '{banner_prompt}',
  to_jsonb('Create a sacred banner image inspired by authentic Nigerian Isese and Ifá tradition for an educational module titled "{title}". Module description: {description}. CULTURAL FOUNDATION - Traditional Yoruba religion (Isese), Ifá divination system, and Orisa worship. Include AUTHENTIC elements: Opon Ifá (divination board), Opele chain, Ikin Ifá (sacred palm nuts), Iroke tapper, Iyerosun powder, Adire textile patterns, Aso-Oke woven fabric, carved calabash patterns, Iroko tree, palm fronds (mariwo), cowrie shells, kola nuts. COLOR PALETTE: Earth browns, terracotta, deep forest greens, indigo blues, warm golds, brass tones, sacred whites. STYLE: Mystical sacred forest or shrine atmosphere, dignified, spiritually evocative. Authentic Nigerian/Yoruba aesthetic - NOT generic African imagery. Subtle, artistic representation.'::text)
)
WHERE slug = 'ifatokun';

-- Atualizar todas as outras orgs com um prompt genérico
UPDATE organizations 
SET branding = jsonb_set(
  COALESCE(branding, '{}'::jsonb),
  '{banner_prompt}',
  to_jsonb('Create a professional banner image for an educational module titled "{title}". Module description: {description}. Style: Clean, modern, professional educational platform aesthetic. Use elegant gradients, abstract geometric shapes, and subtle educational imagery. The design should feel premium and inspiring.'::text)
)
WHERE slug != 'ifatokun';
