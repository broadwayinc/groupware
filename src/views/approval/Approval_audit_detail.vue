<template lang="pug">
.title
    h1 결재

hr

.form-wrap
    form#_el_approved_form
        .table-wrap
            .tb-overflow
                table.table#tb-auditDetail
                    colgroup
                        col(style="width: 10%")
                        col
                        col(style="width: 10%")
                        col
                    tbody
                        tr
                            th 결재 사안
                            td.left.audit-title(v-if="auditDoContent.data?.to_audit") {{ auditDoContent.data.to_audit }}
                            th 기안자
                            td.left.drafter() 이름

                        tr(style="height: 140px")
                            th 결재선
                            td.audit-state.left(colspan="3" style="padding: 0")
                                .stamp-wrap
                                    .stamp-list(v-for="approver in auditUserList" :key="approver.user_id")
                                        span.approver {{ approver.user_info?.name }}
                                        .stamp
                                            template(v-if="approver.approved === 'approve'")
                                                span.approved 승인
                                            template(v-else-if="approver.approved === 'reject'")
                                                span.rejected 반려
                                            template(v-else="!approver.approved || approver.approved === null")
                                                template(v-if="approver.user_id === user.user_id")
                                                    button.btn.sm.outline.btn-approve(type="button" @click="openModal(approver)") 결재
                                                template(v-else)
                                                    span.waitting 대기

                        tr
                            th 결재 내용
                            td.left.audit-content(colspan="3" v-if="auditDoContent.data?.to_audit_content") {{ auditDoContent.data.to_audit_content }}

        br
        br
        br

        .button-wrap
            button.btn.bg-gray.btn-cancel(type="button" @click="$router.push('/approval/audit-list')") 이전

//- 결재 모달
#modal.modal(v-if="isModalOpen")
    form.modal-cont(@click.stop @submit.prevent="postApproval")
        .modal-header
            h2.modal-title 결재
            button.btn-close(@click="closeModal")
                svg
                    use(xlink:href="@/assets/icon/material-icon.svg#icon-close")
        .modal-body
            label.radio-button(style="width: 50%")
                input(type="radio" name="approved" value="approve" checked)
                span.label-radio 결재
            label.radio-button
                input(type="radio" name="approved" value="reject")
                span.label-radio 반려
        .modal-footer
            button.btn.btn-edit(type="submit") 확인


</template>

<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router';
import { ref, computed, watch, onMounted, nextTick } from 'vue';
import { skapi } from '@/main';
import { user } from '@/user';

const router = useRouter();
const route = useRoute();
const auditId = route.params.auditId;

const disabled = ref(true);
const auditDoContent = ref([]);
const auditUserList = ref([]);
const isModalOpen = ref(false);

let isPosting = false;

const openModal = (approver) => {
    if (approver && approver.user_id !== user.user_id) return;

    isModalOpen.value = true;
    disabled.value = false;
};

const closeModal = () => {
    isModalOpen.value = false;
    disabled.value = true;
};

// 다른 사람 결재 여부 확인
const approvedAudit = async () => {
    try {
        const res = await skapi.getRecords({
            table: {
                name: 'audit_approval',
                access_group: 'authorized'
            },
            reference: auditId
        })

        return res.list;
    } catch (error) {
        console.error(error);
    }
    
    isModalOpen.value = false;
}

const getUserInfo = async (userId: string) => {
    const params = {
        searchFor: 'user_id',
        value: userId
    }

    return await skapi.getUsers(params)
}

// 결재 서류 가져오기
const getAuditDetail = async () => {
    try {
        const auditDoc = (await skapi.getRecords({
            record_id: auditId
        })).list[0];

        if (auditDoc) {
            auditDoContent.value = auditDoc;
        }
        
        const approvals = await approvedAudit();

        const approvalUserList = [];
        const newTags = auditDoc.tags.map(a => a.replaceAll('_', '-'))

        newTags.forEach((auditor) => {
            let oa_has_audited_str = null;

            approvals.forEach((approval) => {
                if (approval.user_id === auditor) {
                    oa_has_audited_str = approval.data.approved ? '결재함' : '반려함';

                    const result = {
                        user_id: auditor,
                        approved: approval.data.approved,
                        approved_str: oa_has_audited_str
                    }

                    approvalUserList.push(result);
                    return;
                }
            })

            if (!oa_has_audited_str) {
                const result = {
                    user_id: auditor,
                    approved: null,
                    approved_str: '결제대기중'
                }

                approvalUserList.push(result);
            }
        })

        const userList = await Promise.all(approvalUserList.map(async (auditor) => await getUserInfo(auditor.user_id)))
        const userInfoList = userList.map(user => user.list[0]);                     

        const newAuditUserList = approvalUserList.map((auditor) => ({
            ...auditor,
            user_info: userInfoList.find((user) => user.user_id === auditor.user_id)
        }))

        console.log('newAuditUserList : ', newAuditUserList);
        auditUserList.value = newAuditUserList;
    } catch (error) {
        console.error(error);
    }
}

// 결재 하기
const postApproval = async (e: SubmitEvent) => {
    if (isPosting) return; // 중복 호출 방지
    isPosting = true;
  
    e.preventDefault();

    try {
        if (!auditId) return;

        const userId = user.user_id;

        // 결재 하는 요청
        await skapi.postRecord(e, {
            table: {
                name: 'audit_approval',
                access_group: 'authorized'
            },
            reference: auditId,
            tags: [(userId as string).replaceAll('-', '_')], 
        }).then(res => {
            console.log('결재 === postRecord === res : ', res);

            return skapi.postRealtime(
                {
                    audit_approval: {
                        audit_doc_id: auditId,
                        approval: res.data.approved
                    }
                },
                userId
            ).then(res => {
                console.log('결재 === postRealtime === res : ', res);

                window.alert('결재가 완료되었습니다.');
                closeModal();
                getAuditDetail();
            });
        })
    } catch (error) {
        console.error(error);
    }
}

onMounted(() => {
    getAuditDetail();
});

</script>

<style scoped lang="less">
.wrap {
    padding: 3rem 2.4rem;
}

.form-wrap {
    max-width: 100%;
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

.table-wrap {
    tbody {
        tr {
            &:hover {
                background-color: transparent;
            }
        }

        th {
            border: 1px solid var(--gray-color-300);

            &:first-of-type {
                border-left: none;
            }
        }

        td {
            border: 1px solid var(--gray-color-300);

            &:last-of-type {
                border-right: none;
            }
        }
    }
}

.stamp-wrap {
    display: flex;
    flex-wrap: wrap;
    text-align: center;
    height: 100%;

    .stamp-list {
        display: flex;
        flex-direction: column;
        width: 6rem;
        min-height: 7rem;
        border-right: 1px solid var(--gray-color-300);
    }

    .approver {
        display: inline-block;
        border-bottom: 1px solid var(--gray-color-300);
        color: var(--gray-color-500);
        width: 100%;
        padding: 8px;
    }

    .stamp {
        padding: 8px;
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100%;

        > span {
            display: inline-block;
            padding: 8px;
        }
    }

    .approved {
        color: var(--primary-color-400);
    }

    .rejected {
        color: var(--warning-color-400);
    }

    .waitting {
        color: var(--gray-color-500);
    }

    .btn {
        &.outline {
            &:focus,
            &:active {
                border: 1px solid var(--primary-color-400);
            }
        }
    }
}

@media (max-width: 768px) {

}
</style>