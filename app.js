// ===== Firebase Config =====
const firebaseConfig = {
  apiKey: "AIzaSyCPcbWr3azCSjqo4eMTMl19UZ4YruU6jIM",
  authDomain: "files-b0a4c.firebaseapp.com",
  projectId: "files-b0a4c",
  storageBucket: "files-b0a4c.firebasestorage.app",
  messagingSenderId: "898466817405",
  appId: "1:898466817405:android:8525dad2e312f21c7e5814"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const storage = firebase.storage();
const firestore = firebase.firestore();

// DOM Elements
const fileInput = document.getElementById('fileInput');
const folderInput = document.getElementById('folderInput');
const fileList = document.getElementById('fileList');
const dropArea = document.getElementById('dropArea');

// ===== Upload Files/Folders =====
async function uploadFiles(files) {
  for (const file of files) {
    const path = file.webkitRelativePath || file.name;
    const storageRef = storage.ref().child(path);
    const uploadTask = storageRef.put(file);

    // Create list item & progress bar
    const li = document.createElement('li');
    const nameSpan = document.createElement('span');
    nameSpan.textContent = file.name;
    nameSpan.style.flex = '1'; // take full width, buttons on right
    const progressBar = document.createElement('div');
    progressBar.classList.add('progress-bar');
    li.appendChild(nameSpan);
    li.appendChild(progressBar);
    fileList.prepend(li);

    // Track upload progress
    uploadTask.on('state_changed',
      snapshot => {
        const percent = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        progressBar.style.width = percent + '%';
      },
      error => console.error('Upload error:', error),
      async () => {
        // Save metadata in Firestore
        await firestore.collection('files').doc(path).set({
          name: file.name,
          path: path,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        loadFiles();
      }
    );
  }
}

// File input events
fileInput.addEventListener('change', e => uploadFiles([...e.target.files]));
folderInput.addEventListener('change', e => uploadFiles([...e.target.files]));

// Drag & Drop events
dropArea.addEventListener('dragover', e => {
  e.preventDefault();
  dropArea.classList.add('dragover');
});
dropArea.addEventListener('dragleave', e => {
  e.preventDefault();
  dropArea.classList.remove('dragover');
});
dropArea.addEventListener('drop', e => {
  e.preventDefault();
  dropArea.classList.remove('dragover');
  uploadFiles([...e.dataTransfer.files]);
});

// ===== Load Files from Firestore =====
async function loadFiles() {
  fileList.innerHTML = '';
  const snapshot = await firestore.collection('files').orderBy('createdAt', 'asc').get();

  snapshot.forEach(doc => {
    const file = doc.data();

    const li = document.createElement('li');
    const nameSpan = document.createElement('span');
    nameSpan.textContent = file.name;
    nameSpan.style.flex = '1';

    const actionsDiv = document.createElement('div');
    actionsDiv.classList.add('file-actions');

    // Download button
    const downloadBtn = document.createElement('button');
    downloadBtn.textContent = 'Download';
    downloadBtn.classList.add('download-btn');
    downloadBtn.addEventListener('click', async () => {
      try {
        const url = await storage.ref(file.path).getDownloadURL();
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        a.click();
      } catch (e) {
        alert('Download error: ' + e.message);
      }
    });

    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Delete';
    deleteBtn.classList.add('delete-btn');
    deleteBtn.addEventListener('click', async () => {
      try {
        await storage.ref(file.path).delete();
        await firestore.collection('files').doc(file.path).delete();
        loadFiles();
      } catch (e) {
        alert('Delete error: ' + e.message);
      }
    });

    actionsDiv.appendChild(downloadBtn);
    actionsDiv.appendChild(deleteBtn);

    li.appendChild(nameSpan);
    li.appendChild(actionsDiv);
    fileList.appendChild(li);
  });
}

// Initial load
loadFiles();
