<template lang="pug">
.title
    h1 직원 등록
    span 직원을 등록하면 초대 이메일이 발송됩니다.

hr

.form-wrap
    form#profPic
        .image
            img#profile-img(:src="uploadProfileSrc" alt="profile image")
            label(for="_el_file_input")
                .icon.white
                    svg
                        use(xlink:href="@/assets/icon/material-icon.svg#icon-camera")
            input#_el_file_input(type="file" name="init_profile_pic" @change="changeProfileImg" style="display:none")

    br

    form#_el_emp_form(@submit.prevent="resigterEmp")
        .input-wrap
            p.label.essential 부서
            select(name="division" required disabled)
                option(disabled selected) 부서 선택
        
        br
        
        .input-wrap
            p.label.essential 권한
            select(name="access_group" required)
                option(disabled selected) 권한선택
                option(value="1") 직원
                option(value="98") 관리자
                option(value="99") 마스터

        br

        .input-wrap
            p.label.essential 직책(직급)
            input#_el_position(type="text" name="position" required)

        br

        input(type="text" name="picture" id='_el_picture_input' hidden)

        .input-wrap
            p.label.essential 이름
            input(type="text" name="name" required)
        
        br

        .input-wrap
            p.label.essential 이메일
            input(type="email" name="email" required)

        br

        .input-wrap
            p.label 생년월일
            input(type="date" name="birthdate")

        br

        .input-wrap
            p.label 전화번호
            input(type="tel" name="phone_number")

        br

        .input-wrap
            p.label 주소
            input(type="text" name="address")

        br

ul#_el_prevInv

        .button-wrap
            button.btn.bg-gray(type="button" @click="$router.push('/admin/list-employee')") 취소
            button.btn.bg-gray(type="button" @click="getInvitations") 테스트
            button.btn(type="submit") 등록

br  
br  
br  
</template>

<script setup>
import { useRoute, useRouter } from 'vue-router';
import { ref } from 'vue';
import { skapi } from '@/main';

const router = useRouter();
const route = useRoute();

let getInvitations = () => {
	console.log('click')
	// _el_prevInv.innerHTML = '';

	skapi.getInvitations().then(response => {
		console.log('과거인비테이션', response.list);

		// response.list.forEach(inv => {
		// 	const li = document.createElement('li');
		// 	li.innerHTML = /*html*/ `
		// 		<p>이메일: ${inv.email} 권한: ${inv.access_group} 이름: ${inv.name}</p>
		// 		<button onclick="skapi.resendInvitation({email: '${inv.email}' }).then(m=>alert(m))">재전송</button>
		// 		<button onclick="skapi.cancelInvitation({email: '${inv.email}' }).then(m=>{alert(m); getInvitations()})">초청취소</button>
		// 	`
		// 	_el_prevInv.appendChild(li);
		// });
	});
}

let divisions = skapi.getRecords({
        table: {
            name: 'divisions',
            access_group: 99
        }
}).then(response => response.list);

divisions.then(divisions => {
    divisions.forEach(division => {
        const option = document.createElement('option');
        option.value = division.record_id;
        option.innerText = division.data.division_name;
        document.querySelector('select[name="division"]').appendChild(option);
    });
    document.querySelector('select[name="division"]').disabled = false;
});

let uploadProfileSrc = ref('');

let changeProfileImg = (e) => {
    let file = e.target.files[0];

    if (file) {
        let reader = new FileReader();
        reader.onload = (e) => {
            uploadProfileSrc.value = e.target.result; // ref 값 업데이트
        };
        reader.readAsDataURL(file);
    }
}

let resigterEmp = (e) => {
    // 입력창을 비활성화한다.
    document.querySelectorAll('form input').forEach(el => el.disabled = true);

	async function post() {
		// 사용자를 등록(초대)한다. try catch는 아래와는 달리 작게 만들도록 한다.
		try {
			let email_tag = document.querySelector('input[name=email]').value.replaceAll('.', '_').replace('+', '_').replace('@','_'); // 테크는 특수 문자를 사용할 수 없다.
			if(_el_file_input.files.length > 0) {
				// 사진을 데이터베이스에 업로드하고 보안키를 제외한 이미지 url주소를 userprofile의 picture에 넣어준다.

				let initPicParams = {
					table: {
						name: 'init_profile_pic' + email_tag, // 관리자가 올리는 초기 프로필 사진을 저장하는 테이블
						access_group: 1
					}
				};

				let userInitProfilePic = await skapi.postRecord(document.getElementById('profPic'), initPicParams);
				
				// 프로필에는 보안 키를 제외한 url만 저장한다.
				_el_picture_input.value = userInitProfilePic.bin.init_profile_pic[0].url.split('?')[0];
			}
			
			// 사용자를 초대한다.
			let added = await skapi.inviteUser(event);
			// added = SUCCESS: Invitation has been sent. (User ID: 41d92250-bc3a-45c9-a399-1985a41d762f)
			
			// extract user id
			let user_id = added.split(' ').pop().slice(0, -1).replaceAll('-', '_'); // tag는 특수문자를 사용할 수 없다. (_ 는 사용할수있다)

			// 직원의 부서를 등록한다. user_id는 tag로 사용한다.

			console.log('=== user_id ===', user_id);

			await skapi.postRecord(
				{
					position: _el_position.value // 직책(직급)
				},
				{
					table: {
						name: 'emp_division',
						access_group: 1
					},
					index: {
						name: 'user_id',
						value: user_id
					},
					tags: [_el_position.value] // 여러개의 태그를 사용할 수 있다. 태그를 사용하면 태그된 레코드의 갯수를 알수있다.
				}
			);
			
			// 직원과 마스터만 볼수 있는 자료방 reference 레코드
			let emp_ref = await skapi.postRecord(null, {
				table: {
					name: 'emp_access_ref' + user_id,
					access_group: 99
				},
				tags: [user_id],
			})

			let access_group_value = document.querySelector('select[name=access_group]').value;

			// 마스터가 아니면 직원이므로 직원에게 접근권한을 부여한다. (마스터는 모든 레코드를 볼수 있으므로)
			if(access_group_value !== '99') {
				// 생성된 레코드에 대한 접근권한을 부여한다. (레코드를 reference해서 올리면 직원과 마스터만 볼수 있다)
				await skapi.grantPrivateRecordAccess({
					record_id: emp_ref.record_id,
					user_id: user_id
				});
			}

			// 추가 자료를 업로드한다. 직원에게 reference 레코드에 권한을 부여하면 reference 된 모든 레코드를 열람 할수 있다.
			await skapi.postRecord(document.getElementById('additional_data'), {
				table: {
					name: 'emp_additional_data',
					access_group: 99
				},
				reference: emp_ref.record_id, // emp_access_ref 레코드에
			});

			// 직원과 마스터만 볼수 있는 자료방 reference 레코드 id를 emp_access_reference에 저장한다.
			await skapi.postRecord({
				record_id: emp_ref.record_id
			}, {
				table: {
					name: 'emp_access_reference',
					access_group: 1
				},
				tags: [user_id]
			})

			window.alert('등록완료');
			console.log('등록완료!');
		}
		catch (error) {
			window.alert(error.message);
			document.querySelectorAll('form input').forEach(el => el.disabled = false);
			console.log('등록실패!');

			throw error;
		}

		router.push('/admin/list-employee');
	}
	post();
}
</script>

<style scoped lang="less">
select {

}

.title {
    display: flex;
    flex-wrap: wrap;
    align-items: end;
    gap: 1rem;

    span {
        color: var(--gray-color-400);
        line-height: 1.4;
    }
}

.form-wrap {
    max-width: 650px;
    margin: 0 auto;
}

#profPic {
    text-align: center;

    .image {
        position: relative;
        display: inline-block;

        label {
            position: absolute;
            right: 0;
            bottom: 0;
            background-color: var(--primary-color-400);
            border-radius: 50%;
            cursor: pointer;

            .icon {
                padding: 4px;
                width: 32px;
                height: 32px;
                position: relative;

                svg {
                    width: 18px;
                    height: 18px;
                    transform: translate(-50%, -50%);
                    top: 50%;
                    left: 50%;
                    position: absolute;
                }
            }
        }
    }

    #profile-img {
        width: 100px;
        height: 100px;
        border-radius: 50%;
        display: block;
        object-fit: cover;
        position: relative;
        background-color: var(--gray-color-100);

        &::before {
            content: "No Image";
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            height: 100%;
            background-color: var(--gray-color-100);
            color: #888;
            font-size: 14px;
            text-align: center;
            position: absolute;
            top: 0;
            left: 0;
        }
    }
}

.button-wrap {
    display: flex;
    align-items: center;
    justify-content: end;
    gap: 8px;
}
</style>