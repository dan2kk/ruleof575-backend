import { table_names as tables } from "../database/tables";

const sql_details = (lec_num : number) : string[] => {
    return [
            `
            SELECT
                info."수업번호",
                info."학수번호",
                info."과목명",
                info."이수구분코드명",
                info."학점"::smallint,
                info."이론"::smallint,
                info."실습"::smallint,
                info."대표교강사명",
                info."강좌유형",
                info."수업시간",
                info."강의실",
                info."특수수업구분",
                info."정원",
                pp."설강기준평점",
                pp."A+",
                pp."A0",
                pp."B+",
                pp."B0",
                pp."C+",
                pp."C0",
                pp."D+",
                pp."D0",
                pp."Pass",
                pp."F",
                pp."전체인원"
            FROM ${tables.lec_info} AS info
            JOIN ${tables.pp} as pp
            ON info."수업번호" = ${lec_num} 
                AND pp."수업번호" = info."수업번호" ;
            `,
            `
            SELECT
                pn."수업번호",
                pn."제한인원",
                pn."신청인원",
                pn."다중전공배당인원",
                pn."증원인원",
                pn."희망수업등록인원",
                depart."희망신청소속",
                depart."학생수"
            FROM
                (SELECT prev_info."수업번호"
                FROM ${tables.lec_info} AS info
                JOIN ${tables.prev_lec_info} AS prev_info
                ON info."수업번호" = ${lec_num} 
                    AND info."학수번호" = prev_info."학수번호"
                    AND info."설강소속코드" = prev_info."설강소속코드"
                    AND info."대표교강사명" = prev_info."대표교강사명") AS prev_lecs
            JOIN ${tables.people_num} AS pn
            ON pn."수업번호" = prev_lecs."수업번호"
            JOIN ${tables.depart_stu_num} AS depart
            ON depart."수업번호" = prev_lecs."수업번호"
            ORDER BY prev_lecs."수업번호";
            `,

            `
            SELECT 
                prev_lecs."수업번호",
                prev_lecs."제한인원",
                prev_lecs."신청인원",
                prev_lecs."다중전공배당인원",
                prev_lecs."증원인원",
                prev_lecs."희망수업등록인원",
                depart."희망신청소속",
                depart."학생수"
            FROM 
                (SELECT 
                    info."학수번호",
                    info."설강소속코드",
                    pn."수업번호",
                    pn."제한인원",
                    pn."신청인원",
                    pn."다중전공배당인원",
                    pn."증원인원",
                    pn."희망수업등록인원"
                FROM ${tables.lec_info} AS info
                JOIN ${tables.people_num} AS pn 
                ON info."수업번호" = ${lec_num}
                    AND pn."학수번호" = info."학수번호"
                    AND pn."설강소속코드" = info."설강소속코드") AS prev_lecs
            JOIN ${tables.depart_stu_num} AS depart
            ON depart."수업번호" = prev_lecs."수업번호"
            ORDER BY prev_lecs."수업번호";
            `
    ];
};

const sql_grad_init = (stu_id : string) : string => {
    return  `
            SELECT 
                "전공구분명",
                "이수명",
                "기준",
                "이수" 
            FROM ${tables.grad} 
            WHERE "학번" = '${stu_id}';
            `;
};

const sql_grad_view = (stu_id : string) : string => {
    return  `
            SELECT
                "이수구분코드명",
                "영역코드명",
                "학점"::smallint,
                "특수수업구분"
            FROM ${tables.lec_info} AS info
            JOIN ${tables.list} AS list
            ON list."수업번호" = info."수업번호" 
                AND list."학번" = '${stu_id}'
                AND list."상태" = 1;
            `;
};

const sql_list_init = (stu_id : string) : string => {
    return  `
            SELECT 
                info."수업번호",
                info."과목명",
                info."대표교강사명",
                REPLACE(info."수업시간", ',', '<br />') AS "수업시간",
                info."영역코드명",
                tp_list."요일",
                tp_list."시작시간",
                tp_list."끝시간",
                tp_list."상태" AS "isInTable"
            FROM 
                (SELECT
                    list."수업번호",
                    list."상태",
                    ARRAY_AGG(tp."요일") AS "요일",
                    ARRAY_AGG(tp."시작시간") AS "시작시간",
                    ARRAY_AGG(tp."끝시간") AS "끝시간"
                FROM ${tables.list} AS list
                JOIN ${tables.time_place} AS tp
                ON list."상태" != -1
                    AND list."학번" = '${stu_id}'
                    AND list."수업번호" = tp."수업번호"
                    AND (tp."요일" = '시간미지정강좌' OR tp."시작시간" IS NOT NULL)
                GROUP BY list."수업번호", list."상태") AS tp_list
            JOIN ${tables.lec_info} AS info
            ON info."수업번호" = tp_list."수업번호";
            `;
};

const sql_list_old_list = (stu_id : string) : string => {
    return  `
            SELECT 
                list."수업번호",
                list."상태" AS state
            FROM ${tables.list} AS list
            WHERE list."학번" = '${stu_id}'
                AND list."상태" != -1;
            `;
}

const sql_list_update = (stu_id : string, lecs_to_update : any) : string => {

    let sql = `
            INSERT INTO
                ${tables.list} ("학번", "수업번호", "상태")
            VALUES\n`

    let lec : any;
    for (lec of lecs_to_update) {
        sql += `                ('${stu_id}', ${lec.수업번호}, ${lec.state}),\n`;
    }

    sql = sql.slice(0, -2);
    sql += `
            ON CONFLICT 
                ("수업번호")
            DO UPDATE SET "상태" = EXCLUDED."상태";`

    return sql;
}

const sql_recommend = (intervals : any) : string => { 
    let sql = `
            SELECT 
                recom_info_list."영역코드명",
                ARRAY_agg(json_build_object(
                    '수업번호', recom_info_list."수업번호", 
                    '과목명', recom_info_list."과목명",
                    '대표교강사명', recom_info_list."대표교강사명",
                    '수업시간', recom_info_list."수업시간",
                    '영역코드명', recom_info_list."영역코드명",
                    '요일', recom_info_list."요일",
                    '시작시간', recom_info_list."시작시간",
                    '끝시간', recom_info_list."끝시간",
                    'isInTable', 0
                )) AS "수업목록"
            FROM
                (SELECT
                    info."수업번호",
                    info."과목명",
                    info."대표교강사명",
                    REPLACE(info."수업시간", ',', '<br />') AS "수업시간",
                    info."이수구분코드명",
                    info."영역코드명",
                    recom."요일",
                    recom."시작시간",
                    recom."끝시간"
                FROM
                    (SELECT
                        tp."수업번호",
                        ARRAY_AGG(tp."요일") AS "요일",
                        ARRAY_AGG(tp."시작시간") AS "시작시간",
                        ARRAY_AGG(tp."끝시간") AS "끝시간"
                    FROM
                        (SELECT 
                            "수업번호",
                            COUNT("수업번호") :: smallint AS cnt
                        FROM 
                            ${tables.time_place}
                        WHERE false\n`
            
            let day : any;
            let time : any;
            for(day in intervals) {
                for(time of intervals[day]) {
                    sql += `                            `;
                    sql += `OR ("요일" = '${day}' AND "시작시간" >= '${time.start}'::time AND "끝시간" <= '${time.end}'::time)\n`
                }
            }

            sql += `
                        GROUP BY "수업번호") AS searched
                    JOIN ${tables.time_place} AS tp	
                    ON tp."수업번호" = searched."수업번호"
                        AND (tp."시작시간" IS NOT NULL AND "끝시간" IS NOT NULL)
                    GROUP BY tp."수업번호", searched.cnt
                    HAVING COUNT(tp."수업번호") = searched.cnt) AS recom
                JOIN ${tables.lec_info} AS info
                ON info."수업번호" = recom."수업번호"
                    AND (info."이수구분코드" = 711)) AS recom_info_list
            GROUP BY recom_info_list."영역코드명"
            `;    
            //                    AND (info."이수구분코드" = 111 OR info."이수구분코드" = 711)) AS recom_info_list

    
    return sql;
}

export { 
    sql_details,
    sql_grad_init,
    sql_grad_view,
    sql_list_init,
    sql_list_old_list,
    sql_list_update,
    sql_recommend
};