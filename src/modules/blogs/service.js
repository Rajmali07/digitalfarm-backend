const { supabase } = require('../../config/supabaseClient');

const normalizeText = (value) => {
  if (typeof value !== 'string') {
    return value ?? null;
  }

  const trimmed = value.trim();
  return trimmed || null;
};

// GET BLOGS
const getBlogs = async () => {
  const { data, error } = await supabase
    .from('blogs')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};
const getBlogById = async (id) => {
  const { data, error } = await supabase
    .from('blogs')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
};


// CREATE BLOG
const createBlog = async (userId, body) => {
  const { title, content, category, status, link, image_url } = body;

  const { data, error } = await supabase
    .from('blogs')
    .insert([
      {
        title: normalizeText(title),
        content: normalizeText(content),
        category: normalizeText(category),
        status: normalizeText(status),
        link: normalizeText(link),
        image_url: normalizeText(image_url),
        created_by: userId
      }
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
};

const updateBlog = async (id, body) => {
  const { title, content, category, status, link, image_url } = body;

  const { data, error } = await supabase
    .from('blogs')
    .update({
      title: normalizeText(title),
      content: normalizeText(content),
      category: normalizeText(category),
      status: normalizeText(status),
      link: normalizeText(link),
      image_url: normalizeText(image_url)
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

const deleteBlog = async (id) => {
  const { error } = await supabase
    .from('blogs')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
};

module.exports = { getBlogs, getBlogById, createBlog, updateBlog, deleteBlog };
