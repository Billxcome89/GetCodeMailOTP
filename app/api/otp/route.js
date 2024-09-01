import { NextResponse } from 'next/server';
import Imap from 'node-imap';
import { simpleParser } from 'mailparser';

export async function POST(req) {
    try {
        console.log("Đã nhận được yêu cầu POST");

        const { user, password } = await req.json();
        console.log("Payload nhận được:", { user, password });

        if (!user || !password) {
            console.log("Thiếu tài khoản hoặc mật khẩu");
            return NextResponse.json({ message: 'Thiếu tài khoản hoặc mật khẩu' }, { status: 400 });
        }

        const imapConfig = {
            user: user,
            password: password,
            host: 'imap-mail.outlook.com',
            port: 993,
            tls: true,
            authTimeout: 5000,
        };

        const imap = new Imap(imapConfig);

        return new Promise((resolve, reject) => {
            imap.once('ready', function () {
                console.log('Kết nối thành công');
                imap.openBox('INBOX', true, function (err, box) {
                    if (err) {
                        console.error('Lỗi khi mở hộp thư:', err);
                        reject(NextResponse.json({ message: 'Lỗi khi mở hộp thư' }, { status: 500 }));
                        return;
                    }

                    // Thử tìm kiếm không chỉ với UNSEEN
                    imap.search([['FROM', 'noreply@telegram.org']], function (err, results) {
                        if (err) {
                            console.error('Lỗi khi tìm kiếm email:', err);
                            reject(NextResponse.json({ message: 'Lỗi khi tìm kiếm email' }, { status: 500 }));
                            return;
                        }

                        if (!results || results.length === 0) {
                            console.log('Không tìm thấy email nào trong INBOX.');
                            
                            // Thử tìm kiếm trong thư mục Junk hoặc Spam
                            imap.openBox('Junk', true, function (err, box) {
                                if (err) {
                                    console.error('Lỗi khi mở hộp thư Junk:', err);
                                    resolve(NextResponse.json({ message: 'Không tìm thấy email trong INBOX hoặc Junk' }, { status: 404 }));
                                    return;
                                }

                                imap.search([['FROM', 'noreply@telegram.org']], function (err, junkResults) {
                                    if (err) {
                                        console.error('Lỗi khi tìm kiếm email trong Junk:', err);
                                        resolve(NextResponse.json({ message: 'Lỗi khi tìm kiếm email trong Junk' }, { status: 500 }));
                                        return;
                                    }

                                    if (!junkResults || junkResults.length === 0) {
                                        console.log('Không tìm thấy email nào trong Junk.');
                                        resolve(NextResponse.json({ message: 'Không tìm thấy email nào' }, { status: 404 }));
                                    } else {
                                        fetchEmail(junkResults);
                                    }
                                });
                            });

                            return;
                        }

                        fetchEmail(results);
                    });

                    function fetchEmail(results) {
                        const f = imap.fetch(results, { bodies: '' });

                        f.on('message', function (msg, seqno) {
                            console.log('Message #%d', seqno);
                            msg.on('body', function (stream, info) {
                                let emailBody = '';

                                stream.on('data', function (chunk) {
                                    emailBody += chunk.toString('utf8');
                                });

                                stream.on('end', async function () {
                                    console.log('Nội dung email:', emailBody);

                                    const mail = await simpleParser(emailBody);
                                    const body = mail.text || mail.html;
                                    const otpMatch = body && body.match(/Your code is: (\d{6})/);

                                    if (otpMatch) {
                                        const otpCode = otpMatch[1];
                                        console.log('Tìm thấy OTP:', otpCode);
                                        imap.end();
                                        resolve(NextResponse.json({ otp: otpCode }, { status: 200 }));
                                    } else {
                                        console.log('Không tìm thấy OTP trong email.');
                                    }
                                });
                            });
                        });

                        f.once('error', function (err) {
                            console.error('Lỗi khi truy xuất email:', err);
                            imap.end();
                            resolve(NextResponse.json({ message: 'Lỗi khi truy xuất email' }, { status: 500 }));
                        });

                        f.once('end', function () {
                            console.log('Hoàn thành việc truy xuất email');
                            imap.end();
                        });
                    }
                });
            });

            imap.once('error', function (err) {
                console.log('Lỗi khi kết nối IMAP:', err);
                reject(NextResponse.json({ message: 'Lỗi khi kết nối IMAP' }, { status: 500 }));
            });

            imap.once('end', function () {
                console.log('Đã kết thúc kết nối IMAP');
            });

            imap.connect();
        });

    } catch (error) {
        console.error("Lỗi trong quá trình xử lý:", error);
        return NextResponse.json({ message: 'Lỗi không xác định', error: error.message }, { status: 500 });
    }
}
