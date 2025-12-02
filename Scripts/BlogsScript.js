// ===== SUPABASE CONFIGURATIE =====
const SUPABASE_URL = 'https://ijosozqvlfceivtlnhhq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlqb3NvenF2bGZjZWl2dGxuaGhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1OTAwNTQsImV4cCI6MjA4MDE2NjA1NH0.NoAeAtGMiBRTKAVc8pRSOW03yWs8noWT9-TRTaIkbUY';

const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin123';

// Fix: gebruik createClient van de globale supabase namespace
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== GLOBALE VARIABELEN =====
let isLoggedIn = false;
let currentImageFile = null;
let currentZipFile = null;
let allBlogs = [];

// ===== SIMPELE LOGIN =====
function toggleAuth() {
    if (isLoggedIn) {
        logout();
    } else {
        document.getElementById('loginBox').classList.toggle('hidden');
    }
}

function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('loginError');
    
    errorDiv.innerHTML = '';
    
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        isLoggedIn = true;
        document.getElementById('loginBox').classList.add('hidden');
        document.getElementById('adminPanel').classList.remove('hidden');
        document.getElementById('userInfo').textContent = 'Ingelogd als: ' + username;
        document.getElementById('userInfo').classList.remove('hidden');
        document.getElementById('authBtn').textContent = 'Uitloggen';
        document.getElementById('authBtn').className = 'btn btn-danger';
        document.getElementById('username').value = '';
        document.getElementById('password').value = '';
        loadBlogs();
    } else {
        errorDiv.innerHTML = '<div class="error">Verkeerde gebruikersnaam of wachtwoord!</div>';
    }
}

function logout() {
    isLoggedIn = false;
    document.getElementById('adminPanel').classList.add('hidden');
    document.getElementById('userInfo').classList.add('hidden');
    document.getElementById('authBtn').textContent = 'Admin Login';
    document.getElementById('authBtn').className = 'btn btn-primary';
    cancelAddBlog();
    loadBlogs();
}

// ===== BLOGS LADEN =====
async function loadBlogs() {
    const container = document.getElementById('blogsContainer');
    container.innerHTML = '<p class="loading">Blogs laden...</p>';
    
    const { data, error } = await supabaseClient
        .from('blogs')
        .select('*')
        .order('date', { ascending: false });
    
    if (error) {
        container.innerHTML = '<div class="error">Fout bij laden: ' + error.message + '</div>';
        return;
    }
    
    allBlogs = data || [];
    renderBlogs(allBlogs);
}

function renderBlogs(blogs) {
    const container = document.getElementById('blogsContainer');
    
    if (blogs.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:#6B7280;">Geen blogs gevonden...</p>';
        return;
    }
    
    container.innerHTML = blogs.map(b => `
        <div class="blog-post" data-id="${b.id}">
            ${b.image_url ? '<img src="' + b.image_url + '" class="blog-image">' : ''}
            <div class="blog-content">
                ${isLoggedIn ? '<button class="delete-btn" data-id="' + b.id + '">🗑️ Verwijderen</button>' : ''}
                <h3 class="blog-title">${b.title}</h3>
                <p class="blog-date">${new Date(b.date).toLocaleString('nl-NL')}</p>
                <p class="blog-text">${truncateText(b.content)}</p>
                ${b.tags && b.tags.length > 0 ? '<p class="blog-tags">' + b.tags.join(', ') + '</p>' : ''}
            </div>
        </div>
    `).join('');
    
    document.querySelectorAll('.blog-post').forEach(post => {
        post.addEventListener('click', () => {
            const blogId = Number(post.dataset.id);
            const blog = allBlogs.find(b => b.id === blogId);
            if (blog) openModal(blog);
        });
    });
    
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', e => {
            e.stopPropagation();
            deleteBlog(Number(btn.dataset.id));
        });
    });
}

function filterBlogs() {
    const query = document.getElementById('searchBlogs').value.toLowerCase();
    const filtered = allBlogs.filter(b => {
        return b.title.toLowerCase().includes(query) ||
               b.content.toLowerCase().includes(query) ||
               (b.tags && b.tags.join(',').toLowerCase().includes(query));
    });
    renderBlogs(filtered);
}

function truncateText(text, maxLength = 200) {
    return text.length <= maxLength ? text : text.substring(0, maxLength) + '...';
}

// ===== BLOG TOEVOEGEN =====
function toggleAddBlog() {
    document.getElementById('addBlogForm').classList.toggle('hidden');
}

function cancelAddBlog() {
    document.getElementById('addBlogForm').classList.add('hidden');
    document.getElementById('blogTitle').value = '';
    document.getElementById('blogContent').value = '';
    document.getElementById('blogImage').value = '';
    document.getElementById('imagePreview').innerHTML = '';
    document.getElementById('blogFile').value = '';
    document.getElementById('filePreview').innerHTML = '';
    document.getElementById('blogTags').value = '';
    document.getElementById('blogDate').value = '';
    document.getElementById('addBlogError').innerHTML = '';
    currentImageFile = null;
    currentZipFile = null;
}

function previewImage() {
    const file = document.getElementById('blogImage').files[0];
    if (file) {
        currentImageFile = file;
        const reader = new FileReader();
        reader.onload = e => {
            document.getElementById('imagePreview').innerHTML = 
                '<img src="' + e.target.result + '" class="preview-image">';
        };
        reader.readAsDataURL(file);
    }
}

function previewFile() {
    const file = document.getElementById('blogFile').files[0];
    if (file) {
        currentZipFile = file;
        document.getElementById('filePreview').innerHTML = 
            '<p>Bestand geselecteerd: ' + file.name + '</p>';
    }
}

async function addBlog() {
    if (!isLoggedIn) {
        alert('Je moet ingelogd zijn!');
        return;
    }
    
    const title = document.getElementById('blogTitle').value;
    const content = document.getElementById('blogContent').value;
    const tags = document.getElementById('blogTags').value.split(',').map(t => t.trim()).filter(t => t);
    const dateInput = document.getElementById('blogDate').value;
    const errorDiv = document.getElementById('addBlogError');
    
    errorDiv.innerHTML = '';
    
    if (!title || !content) {
        errorDiv.innerHTML = '<div class="error">Vul titel en inhoud in!</div>';
        return;
    }
    
    let imageUrl = null;
    let fileUrl = null;
    let fileName = null;
    
    // Upload afbeelding naar Supabase Storage
    if (currentImageFile) {
        const imageFileName = Date.now() + '-' + currentImageFile.name;
        const { data: imageData, error: imageError } = await supabaseClient.storage
            .from('blog-images')
            .upload(imageFileName, currentImageFile);
        
        if (imageError) {
            errorDiv.innerHTML = '<div class="error">Afbeelding upload mislukt: ' + imageError.message + '</div>';
            return;
        }
        
        const { data: publicUrlData } = supabaseClient.storage
            .from('blog-images')
            .getPublicUrl(imageFileName);
        
        imageUrl = publicUrlData.publicUrl;
    }
    
    // Upload ZIP bestand naar Supabase Storage
    if (currentZipFile) {
        fileName = currentZipFile.name;
        const zipFileName = Date.now() + '-' + fileName;
        const { data: fileData, error: fileError } = await supabaseClient.storage
            .from('blog-files')
            .upload(zipFileName, currentZipFile);
        
        if (fileError) {
            errorDiv.innerHTML = '<div class="error">Bestand upload mislukt: ' + fileError.message + '</div>';
            return;
        }
        
        const { data: publicUrlData } = supabaseClient.storage
            .from('blog-files')
            .getPublicUrl(zipFileName);
        
        fileUrl = publicUrlData.publicUrl;
    }
    
    const date = dateInput ? new Date(dateInput).toISOString() : new Date().toISOString();
    
    // Blog toevoegen aan database
    const { error } = await supabaseClient
        .from('blogs')
        .insert([{
            title,
            content,
            tags,
            image_url: imageUrl,
            file_url: fileUrl,
            file_name: fileName,
            date,
            downloads: 0
        }]);
    
    if (error) {
        errorDiv.innerHTML = '<div class="error">Blog toevoegen mislukt: ' + error.message + '</div>';
    } else {
        cancelAddBlog();
        loadBlogs();
    }
}

// ===== BLOG VERWIJDEREN =====
async function deleteBlog(id) {
    if (!isLoggedIn) {
        alert('Je moet ingelogd zijn!');
        return;
    }
    
    if (!confirm('Weet je zeker dat je deze blog wilt verwijderen?')) return;
    
    // Eerst de blog ophalen
    const { data: blog, error: fetchError } = await supabaseClient
        .from('blogs')
        .select('*')
        .eq('id', id)
        .single();
    
    if (fetchError) {
        alert('Fout bij ophalen blog: ' + fetchError.message);
        return;
    }
    
    // Verwijder afbeelding uit storage
    if (blog && blog.image_url) {
        try {
            // Extract alleen de filename na de laatste slash
            const urlParts = blog.image_url.split('/');
            const imagePath = urlParts[urlParts.length - 1];
            const { error: imageError } = await supabaseClient.storage
                .from('blog-images')
                .remove([imagePath]);
            
            if (imageError) {
                console.warn('Waarschuwing bij verwijderen afbeelding:', imageError.message);
            }
        } catch (e) {
            console.warn('Fout bij verwijderen afbeelding:', e);
        }
    }
    
    // Verwijder bestand uit storage
    if (blog && blog.file_url) {
        try {
            const urlParts = blog.file_url.split('/');
            const filePath = urlParts[urlParts.length - 1];
            const { error: fileError } = await supabaseClient.storage
                .from('blog-files')
                .remove([filePath]);
            
            if (fileError) {
                console.warn('Waarschuwing bij verwijderen bestand:', fileError.message);
            }
        } catch (e) {
            console.warn('Fout bij verwijderen bestand:', e);
        }
    }
    
    // Verwijder blog uit database
    const { error: deleteError } = await supabaseClient
        .from('blogs')
        .delete()
        .eq('id', id);
    
    if (deleteError) {
        alert('Verwijderen mislukt: ' + deleteError.message);
    } else {
        alert('Blog succesvol verwijderd!');
        loadBlogs();
    }
}

// ===== MODAL =====
async function openModal(blog) {
    const modal = document.getElementById('blogModal');
    modal.classList.add('show');
    
    document.getElementById('modalTitle').textContent = blog.title;
    document.getElementById('modalDate').textContent = new Date(blog.date).toLocaleString('nl-NL');
    document.getElementById('modalContent').innerHTML = marked.parse(blog.content);
    
    const modalImg = document.getElementById('modalImage');
    if (blog.image_url) {
        modalImg.src = blog.image_url;
        modalImg.classList.remove('hidden');
    } else {
        modalImg.classList.add('hidden');
    }
    
    const modalFile = document.getElementById('modalFile');
    if (blog.file_url) {
        modalFile.href = blog.file_url;
        modalFile.download = blog.file_name;
        modalFile.textContent = `📦 Download Project: ${blog.file_name} (${blog.downloads} downloads)`;
        modalFile.classList.remove('hidden');
        
        modalFile.onclick = async () => {
            const { error } = await supabaseClient
                .from('blogs')
                .update({ downloads: blog.downloads + 1 })
                .eq('id', blog.id);
            
            if (!error) {
                blog.downloads++;
                modalFile.textContent = `📦 Download Project: ${blog.file_name} (${blog.downloads} downloads)`;
            }
        };
    } else {
        modalFile.classList.add('hidden');
    }
    
    const modalTags = document.getElementById('modalTags');
    modalTags.innerHTML = blog.tags && blog.tags.length > 0 ? 
        '<p class="blog-tags">' + blog.tags.join(', ') + '</p>' : '';
}

function closeModal() {
    document.getElementById('blogModal').classList.remove('show');
}

// ===== INITIALISATIE =====
document.addEventListener('DOMContentLoaded', loadBlogs);