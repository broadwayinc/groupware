// 서비스 워커 설치 및 활성화
self.addEventListener('install', (event) => {
    console.log('[Service Worker] Installed');
    event.waitUntil(self.skipWaiting()); // 즉시 활성화
});

    self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Activated');
    event.waitUntil(self.clients.claim()); // 모든 클라이언트를 제어
});

let badgeCount = 0; // 뱃지 숫자를 저장할 변수

self.addEventListener('push', function(event) {
	const data = event.data.json();
	console.log('[Service Worker] Push Received.', data);
    const title = data.title || "Default Title";
    const options = {
        body: data.body || "Default Body",
        icon: 'icon-192x192.png',
        badge: 'icon-192x192.png'
    };
    
    // event.waitUntil(
    //     self.registration.showNotification(title, options)
    // );

	// 알림 표시 및 뱃지 업데이트
    event.waitUntil(
        Promise.all([
            // 1. 알림 표시
            self.registration.showNotification(title, options),

            // 2. PWA 뱃지 업데이트
            (async () => {
                try {
                    // 현재 뱃지 숫자를 1 증가
                    const newBadgeCount = badgeCount + 1;

                    // 새로운 뱃지 숫자 설정
                    await navigator.setAppBadge(newBadgeCount);
                    console.log(`[Service Worker] Badge updated to ${newBadgeCount}`);

                    // 뱃지 숫자 업데이트
                    badgeCount = newBadgeCount;

                    // main.ts로 newBadgeCount 전송
                    self.clients.matchAll().then(clients => {
                        clients.forEach(client => {
                            client.postMessage({
                                type: 'BADGE_UPDATED',
                                badgeCount: newBadgeCount
                            });
                        });
                    });
                } catch (error) {
                    console.error('[Service Worker] Failed to update badge:', error);
                }
            })()
        ])
    );




    // const data = event.data.json();
    // const title = data.title || "Default Title";
	// const urlMap = {
	// 	'audit': '/approval/audit-detail/',
    //     'default': '/'                              // 기본 페이지
    // };
	
	// console.log('sw.js에서 받은 알람 정보', data);

	// // let body = JSON.parse(data.body);

	// // // try{
	// // // 	body = JSON.parse(body);

	// // // 	if(body && body.data) {
	// // // 		options.data = body.data;
	// // // 	}
	// // // }
	// // // catch(err){}

	// // const options = {
	// // 	body: body.text || "Default Body",
	// // 	icon: 'icon-192x192.png',
	// // 	badge: 'icon-192x192.png'
	// // };

	// // if(body.type) {
	// // 	options.data.type = body.type
	// // }

	// // if(body.id) {
	// // 	options.data.url = urlMap[body.url] + body.id;
	// // } else {
	// // 	options.data.url = '/';
	// // }

	// // console.log('sw.js에서 받은 옵션', options);




	// // 17:45
	// const options = {
	// 	body: data.body || "Default Body",
	// 	icon: 'icon-192x192.png',
	// 	badge: 'icon-192x192.png'
	// }



    
    // event.waitUntil(
    //     self.registration.showNotification(title, options)
    // );
});

self.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'RESET_BADGE') {
        // 메인 애플리케이션에서 전달된 뱃지 숫자로 초기화
        badgeCount = event.data.badgeCount || 0;
        console.log(`[Service Worker] Badge count reset to ${badgeCount}`);

        // PWA 뱃지도 초기화
        navigator.clearAppBadge().then(() => {
            console.log('[Service Worker] App badge cleared.');
        }).catch(error => {
            console.error('[Service Worker] Failed to clear app badge:', error);
        });
    }
});

self.addEventListener('notificationclick', function(event) {
	event.notification.close();
    // current website url
    let url = event.target.location.origin;
    event.waitUntil(
        clients.openWindow(url)
    );
	// // // 뱃지 초기화
	// // if ('clearAppBadge' in self.navigator) {
	// // 	self.navigator.clearAppBadge().catch((error) => {
	// // 	  console.error('Failed to clear app badge:', error);
	// // 	});
	// // }

	// // // 메인 애플리케이션에 알림 클릭 이벤트 알림
	// // self.clients.matchAll().then((clients) => {
	// // 	clients.forEach((client) => {
	// // 	  client.postMessage({ type: 'clear-badge' });
	// // 	});
	// // });

	// // 알림 닫기
    // event.notification.close();

    // // 현재 웹사이트 URL
    // let url = event.target.location.origin;

	// // 메인 애플리케이션에 메세지 전송
    // event.waitUntil(
    //     clients.openWindow(url)

	// 	// clients.matchAll().then((clients) => {
    //     //     clients.forEach((client) => {
    //     //         client.postMessage({ type: 'notification-clicked' });
    //     //     });

    //     //     // 새 창 열기 (옵션)
    //     //     if (!clients.length) {
    //     //         return clients.openWindow(url);
    //     //     }
    //     // })

	// 	// clients.matchAll().then((clients) => {
    //     //     clients.forEach((client) => {
    //     //         client.postMessage({
    //     //             type: 'notification-clicked',
    //     //             notificationType: data.type, // 알림 종류
    //     //             url: data.url                // 연결할 URL
    //     //         });
    //     //     });

    //     //     // 새 창 열기
    //     //     return clients.openWindow(data.url || '/');
    //     // })
    // );
});