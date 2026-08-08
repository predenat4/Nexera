
self.addEventListener('push', function(event) {
  const data = event.data.json();
  const options = {
    body: data.body || 'N\'oublie pas de valider ta journée !',
    icon: 'logo.jpg', // Vous pouvez changer l'icône ici
    badge: 'logo.jpg'
  };
  event.waitUntil(
    self.registration.showNotification(data.title || 'Nexera', options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/') // URL vers laquelle rediriger
  );
});
